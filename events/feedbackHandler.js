const { EmbedBuilder } = require('discord.js');
const warrantyUtils = require('../utils/warrantyUtils');
const { uploadAttachmentToCatbox } = require('../utils/catbox');

/**
 * Parse feedback message để lấy seller (người bán) và order name
 * Format: "+1 legit @username order name"
 * @username phải là người bán (addedBy) của đơn hàng
 */
async function parseFeedbackMessage(message) {
    const content = message.content.trim();
    
    // Kiểm tra xem có bắt đầu bằng "+1 legit" không
    if (!content.toLowerCase().startsWith('+1 legit')) {
        return null;
    }

    // Loại bỏ "+1 legit" khỏi nội dung
    let remaining = content.substring(8).trim();
    
    let orderName = null;
    let sellerId = null;

    const config = message.client.config;
    const defaultSellerUsername = config.WARRANTY?.DEFAULT_SELLER_USERNAME;

    // Lấy user được tag (người bán) - phải là mention hợp lệ và không phải bot
    const mention = message.mentions.users.first();
    if (mention) {
        if (mention.bot) {
            // Nếu tag bot, không chấp nhận feedback
            return null;
        }
        // Mention hợp lệ và không phải bot
        sellerId = mention.id;
        // Loại bỏ mention pattern khỏi nội dung
        remaining = remaining.replace(/<@!?\d+>/g, '').trim();
    } else {
        // Tìm mention pattern trong content (<@userId>)
        const mentionPattern = /<@!?(\d+)>/;
        const mentionMatch = remaining.match(mentionPattern);
        
        if (mentionMatch) {
            const userId = mentionMatch[1];
            // Kiểm tra xem user có tồn tại và không phải bot không
            try {
                let user = message.client.users.cache.get(userId);
                // Nếu không có trong cache, thử fetch
                if (!user) {
                    user = await message.client.users.fetch(userId).catch(() => null);
                }
                if (user && !user.bot) {
                    sellerId = userId;
                }
            } catch (error) {
                // Không tìm thấy user
            }
            remaining = remaining.replace(mentionPattern, '').trim();
        }
        
        // Nếu không có mention hợp lệ, sử dụng default seller từ config
        if (!sellerId && defaultSellerUsername) {
            try {
                // Tìm user theo username trong guild
                const guild = message.guild;
                if (guild) {
                    const members = await guild.members.fetch();
                    const defaultSeller = members.find(m => 
                        m.user.username === defaultSellerUsername || 
                        m.user.username.toLowerCase() === defaultSellerUsername.toLowerCase() ||
                        m.displayName === defaultSellerUsername ||
                        m.displayName.toLowerCase() === defaultSellerUsername.toLowerCase()
                    );
                    
                    if (defaultSeller && !defaultSeller.user.bot) {
                        sellerId = defaultSeller.user.id;
                    }
                }
            } catch (error) {
                console.log(`⚠️ Không tìm thấy default seller: ${defaultSellerUsername} - ${error.message}`);
            }
        }
        
        // Nếu vẫn không có sellerId, không chấp nhận feedback
        if (!sellerId) {
            return null;
        }
    }

    // Phần còn lại là order name
    orderName = remaining.trim();

    // Kiểm tra: PHẢI có tên mặt hàng đằng sau (không được để trống)
    // Loại bỏ các ký tự đặc biệt và khoảng trắng để kiểm tra
    const orderNameWithoutSpaces = orderName.replace(/\s+/g, '');
    
    // Nếu không có order name, order name chỉ là khoảng trắng, hoặc không có sellerId → không chấp nhận feedback
    if (!orderName || 
        orderName.length === 0 || 
        orderNameWithoutSpaces.length === 0 || 
        !sellerId) {
        return null;
    }

    return { orderName, sellerId };
}

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        // Chỉ xử lý trong feedback channel và bỏ qua tin nhắn từ bot
        if (!message.client.config.FEEDBACK_CHANNEL || 
            message.channel.id !== message.client.config.FEEDBACK_CHANNEL || 
            message.author.bot) {
            return;
        }

        const client = message.client;
        const config = client.config;
        const db = client.db;

        // Kiểm tra xem db có tồn tại và có methods không
        if (!db || typeof db.getLastFeedbackEmbed !== 'function') {
            console.error('❌ Database chưa được khởi tạo đúng cách');
            return;
        }

        try {
            // Tự động react 3 emoji
            for (const emoji of config.FEEDBACK_REACTIONS) {
                await message.react(emoji);
            }

            // Xóa embed cũ nếu có
            const lastEmbedId = db.getLastFeedbackEmbed();
            if (lastEmbedId) {
                try {
                    const oldMessage = await message.channel.messages.fetch(lastEmbedId);
                    if (oldMessage && oldMessage.author.id === client.user.id) {
                        await oldMessage.delete();
                    }
                } catch (error) {
                    console.log('Không thể xóa tin nhắn cũ:', error.message);
                }
            }

            // Tạo embed hướng dẫn feedback
            const embed = new EmbedBuilder()
                .setColor(`#c8f0ff`)
                .setTitle(`Iris Market`)
                .setDescription('**Cách gửi feedback trong kênh:**\n```yaml\n+1 legit [người bán] [tên sản phẩm] [ảnh] ```\n**Cám ơn bạn đã sử dụng dịch vụ bên mình, lần sau ủng hộ tiếp bạn nhé**')
                .setTimestamp()
                .setFooter({ text: 'Iris Market', iconURL: config.IMG })
                .setThumbnail(config.LEGITIMG);

            // Gửi embed mới
            const newEmbed = await message.channel.send({ embeds: [embed] });
            
            // Lưu ID tin nhắn embed mới
            db.setLastFeedbackEmbed(newEmbed.id);

            // Xử lý feedback cho đơn hàng
            const parsed = await parseFeedbackMessage(message);
            if (parsed) {
                const feedbackUserId = message.author.id;
                const orderName = parsed.orderName;
                const sellerId = parsed.sellerId;

                // Tìm đơn hàng tương ứng (phải khớp cả order name và seller)
                const order = await warrantyUtils.findOrderByOrderNameAndSeller(feedbackUserId, orderName, sellerId);

                if (order) {
                    // Kiểm tra và upload ảnh vouch nếu có
                    let vouchImageLink = null;
                    if (message.attachments && message.attachments.size > 0) {
                        // Lấy ảnh đầu tiên (nếu có)
                        const firstAttachment = message.attachments.first();
                        if (firstAttachment && firstAttachment.contentType && firstAttachment.contentType.startsWith('image/')) {
                            try {
                                vouchImageLink = await uploadAttachmentToCatbox(firstAttachment);
                                if (vouchImageLink) {
                                    console.log(`✅ Đã upload ảnh vouch cho đơn ${order.orderId}: ${vouchImageLink}`);
                                } else {
                                    console.log(`⚠️ Không thể upload ảnh vouch cho đơn ${order.orderId}`);
                                }
                            } catch (error) {
                                console.error(`❌ Lỗi khi upload ảnh vouch cho đơn ${order.orderId}:`, error);
                            }
                        }
                    }

                    // Đánh dấu đơn đã feedback (không thông báo lên Discord về việc lưu ảnh)
                    const updatedOrder = await warrantyUtils.markOrderFeedback(
                        order.orderId,
                        new Date().toISOString(),
                        feedbackUserId,
                        vouchImageLink
                    );

                    if (updatedOrder) {
                        console.log(`✅ Đã ghi nhận feedback cho đơn ${order.orderId} từ ${message.author.username}${vouchImageLink ? ` (có ảnh vouch)` : ''}`);

                        // Tạo embed thông báo
                        const ticketEmbed = warrantyUtils.createFeedbackNotificationEmbed(
                            updatedOrder,
                            message.author
                        );

                        // Chuẩn bị embed cho admin và khách
                        const priceText = updatedOrder.price ? `${updatedOrder.price.toLocaleString('vi-VN')}đ` : 'N/A';
                        const hasWarranty = updatedOrder.hasWarranty !== false;
                        const ticketNote = hasWarranty 
                            ? '🛡️ Đơn hàng đã kích hoạt bảo hành'
                            : '⚠️ Đơn hàng bị từ chối kích hoạt bảo hành';

                        const adminEmbed = new EmbedBuilder()
                            .setColor(hasWarranty ? '#00ff00' : '#ffaa00')
                            .setTitle('✅ Khách đã gửi feedback')
                            .setDescription([
                                `**Khách:** <@${updatedOrder.userId}> (${updatedOrder.username})`,
                                `**Đơn hàng:** ${updatedOrder.orderName}`,
                                `**Mã đơn:** \`${updatedOrder.orderId}\``,
                                `**Giá:** ${priceText}`,
                                '',
                                ticketNote
                            ].join('\n'))
                            .setTimestamp()
                            .setFooter({ text: 'Iris Managers • Powered By Iris Studio', iconURL: config.IMG });

                        const customerEmbed = new EmbedBuilder()
                            .setColor('#00ff99')
                            .setTitle('🎉 Cảm ơn bạn đã feedback!')
                            .setDescription([
                                `**Đơn hàng:** ${updatedOrder.orderName}`,
                                `**Mã đơn:** \`${updatedOrder.orderId}\``,
                                `**Giá:** ${priceText}`,
                                '',
                                hasWarranty 
                                    ? 'Đơn hàng của bạn đã được ghi nhận feedback và **kích hoạt bảo hành**.'
                                    : 'Đơn hàng của bạn đã được ghi nhận feedback.\n⚠️ **Lưu ý:** Mặt hàng này không nhận bảo hành.',
                                'Nếu cần hỗ trợ thêm, vui lòng liên hệ staff nhé!'
                            ].join('\n'))
                            .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                            .setTimestamp()
                            .setFooter({ text: 'Iris Manager • Powered By Iris Studio', iconURL: config.IMG });

                        // Thông báo cho admin vào channel (nếu có cấu hình)
                        const adminNotificationChannelId = config.WARRANTY?.ADMIN_NOTIFICATION_CHANNEL;
                        if (adminNotificationChannelId) {
                            try {
                                const adminChannel = await client.channels.fetch(adminNotificationChannelId);
                                if (adminChannel) {
                                    await adminChannel.send({ embeds: [adminEmbed] });
                                    console.log(`✅ Đã gửi thông báo cho admin trong channel ${adminChannel.name}`);
                                }
                            } catch (error) {
                                console.log(`⚠️ Không thể gửi thông báo vào admin channel: ${error.message}`);
                            }
                        }

                        // Thông báo cho khách hàng (feedback user)
                        try {
                            const customerUser = await client.users.fetch(updatedOrder.userId);
                            if (customerUser) {
                                await customerUser.send({ embeds: [customerEmbed] });
                                console.log(`✅ Đã gửi thông báo cho khách hàng ${customerUser.username}`);
                            }
                        } catch (error) {
                            console.log(`⚠️ Không thể gửi DM cho khách hàng: ${error.message}`);
                        }

                        // Thông báo trong kênh ticket (nơi đã dùng lệnh addorder)
                        if (updatedOrder.channelId) {
                            try {
                                const ticketChannel = await client.channels.fetch(updatedOrder.channelId);
                                if (ticketChannel) {
                                    await ticketChannel.send({ embeds: [ticketEmbed] });
                                    console.log(`✅ Đã gửi thông báo trong ticket channel ${ticketChannel.name}`);
                                }
                            } catch (error) {
                                console.log(`⚠️ Không thể gửi thông báo trong ticket channel: ${error.message}`);
                            }
                        }
                    }
                } else {
                    console.log(`⚠️ Không tìm thấy đơn hàng cho feedback: ${orderName} từ user ${message.author.username}`);
                }
            }

            console.log(`✅ Xử lý feedback từ ${message.author.username} trong ${message.channel.name}`);

        } catch (error) {
            console.error('❌ Lỗi xử lý feedback:', error);
        }
    }
};