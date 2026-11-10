const { EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const config = require('../../config.json');
const { hasStaffRole } = require('../../utils/helpers');

const DB_PATH = path.join(__dirname, '../../database/orders.json');

module.exports = {
    name: 'addorder',
    description: 'Thêm đơn hàng cho khách hàng',
    usage: 'addorder <@user> <tên đơn hàng> <giá tiền> [true/false]',
    aliases: ['ao', 'addo'],
    
    async execute(message, args) {
        try {
            // Kiểm tra quyền staff
            const member = await message.guild.members.fetch(message.author.id);
            if (!hasStaffRole(member)) {
                return message.reply('❌ Chỉ có staff mới có thể sử dụng lệnh này!');
            }

            // Check if user is mentioned
            const userMention = message.mentions.users.first();
            if (!userMention) {
                return message.reply('❌ Vui lòng mention người dùng! Sử dụng: `addorder @user <tên đơn hàng> <giá tiền>`');
            }

            // Remove mention from args
            const argsWithoutMention = args.filter(arg => !arg.includes(userMention.id));
            
            if (argsWithoutMention.length < 2) {
                return message.reply('❌ Thiếu thông tin! Sử dụng: `addorder @user <tên đơn hàng> <giá tiền> [true/false]`');
            }

            // Kiểm tra phần tử cuối cùng có phải là true/false không
            let hasWarranty = true; // Mặc định có bảo hành
            const lastArg = argsWithoutMention[argsWithoutMention.length - 1]?.toLowerCase();
            
            if (lastArg === 'false') {
                hasWarranty = false;
                argsWithoutMention.pop(); // Loại bỏ "false" khỏi args
            } else if (lastArg === 'true') {
                hasWarranty = true;
                argsWithoutMention.pop(); // Loại bỏ "true" khỏi args
            }

            if (argsWithoutMention.length < 2) {
                return message.reply('❌ Thiếu thông tin! Sử dụng: `addorder @user <tên đơn hàng> <giá tiền> [true/false]`');
            }

            // Lấy giá tiền từ cuối cùng (số cuối cùng)
            // Tìm số cuối cùng trong args
            let price = null;
            let priceIndex = -1;
            
            // Tìm từ cuối lên để tìm số (giá tiền)
            for (let i = argsWithoutMention.length - 1; i >= 0; i--) {
                const arg = argsWithoutMention[i];
                // Loại bỏ các ký tự không phải số và thử parse
                const cleanedArg = arg.replace(/[^\d]/g, '');
                if (cleanedArg.length > 0) {
                    const parsedPrice = parseInt(cleanedArg);
                    if (!isNaN(parsedPrice) && parsedPrice > 0) {
                        price = parsedPrice;
                        priceIndex = i;
                        break;
                    }
                }
            }

            // Nếu không tìm thấy giá tiền hợp lệ
            if (!price || priceIndex === -1) {
                return message.reply('❌ Giá tiền không hợp lệ! Vui lòng nhập số tiền hợp lệ ở cuối lệnh.');
            }

            // Phần còn lại (từ đầu đến trước giá tiền) là order name
            const orderNameParts = argsWithoutMention.slice(0, priceIndex);
            const orderName = orderNameParts.join(' ');

            // Kiểm tra order name không được rỗng
            if (!orderName || orderName.trim().length === 0) {
                return message.reply('❌ Tên đơn hàng không được để trống! Sử dụng: `addorder @user <tên đơn hàng> <giá tiền>`');
            }

            // Always use current date as purchase date
            const purchaseDate = new Date();

            // Generate unique order ID
            const orderId = `ORD${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

            // Lấy thông tin người bán từ DEFAULT_SELLER_USERNAME trong config
            const defaultSellerUsername = config.WARRANTY?.DEFAULT_SELLER_USERNAME || 'tcpfox.v3';
            let defaultSellerId = null;
            let defaultSellerUser = null;
            
            // Tìm user theo username trong guild để lấy ID và user object
            try {
                const members = await message.guild.members.fetch();
                const defaultSellerMember = members.find(m => 
                    m.user.username === defaultSellerUsername || 
                    m.user.username.toLowerCase() === defaultSellerUsername.toLowerCase() ||
                    m.displayName === defaultSellerUsername ||
                    m.displayName.toLowerCase() === defaultSellerUsername.toLowerCase()
                );
                
                if (defaultSellerMember) {
                    defaultSellerId = defaultSellerMember.user.id;
                    defaultSellerUser = defaultSellerMember.user;
                }
            } catch (error) {
                console.error(`⚠️ Không tìm thấy default seller: ${defaultSellerUsername} - ${error.message}`);
            }

            // Read existing orders
            let ordersData;
            try {
                const data = await fs.readFile(DB_PATH, 'utf8');
                ordersData = JSON.parse(data);
            } catch (error) {
                ordersData = { orders: [] };
            }

            // Create new order
            const newOrder = {
                orderId: orderId,
                userId: userMention.id,
                username: userMention.username,
                orderName: orderName,
                price: price,
                purchaseDate: purchaseDate.toISOString(),
                addedBy: defaultSellerId || message.author.id, // Sử dụng default seller ID, nếu không tìm thấy thì dùng người chạy lệnh
                addedAt: new Date().toISOString(),
                channelId: message.channel.id, // Lưu channel nơi tạo đơn (ticket channel)
                // Warranty fields
                hasWarranty: hasWarranty, // Có bảo hành hay không
                hasFeedback: false,
                warrantyEligible: hasWarranty ? true : false, // Nếu không có bảo hành thì warrantyEligible = false
                leftServer: false
            };

            // Add order to database
            ordersData.orders.push(newOrder);
            await fs.writeFile(DB_PATH, JSON.stringify(ordersData, null, 4));

            // Format date for display
            const formattedDate = purchaseDate.toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });

            const embed = new EmbedBuilder()
                .setTitle('✅ Thêm Đơn Hàng Thành Công')
                .setDescription([
                    `**Mã Đơn:** \`${orderId}\``,
                    `**Khách Hàng:** ${userMention} (${userMention.username})`,
                    `**Tên Đơn Hàng:** ${orderName}`,
                    `**Giá Tiền:** ${price.toLocaleString('vi-VN')}đ`,
                    `**Ngày Mua:** ${formattedDate}`,
                    `**Bảo Hành:** ${hasWarranty ? '✅ Có' : '❌ Không'}`,
                    '',
                    'Đơn hàng đã được thêm vào hệ thống!',
                    hasWarranty ? '' : '⚠️ **Lưu ý:** Mặt hàng này không có bảo hành, nhưng feedback vẫn là bắt buộc.'
                ].join('\n'))
                .setColor('#00ff00')
                .setThumbnail(userMention.displayAvatarURL({ dynamic: true }))
                .setTimestamp()
                .setFooter({ text: 'Iris Manager • Powered By Iris Studio', iconURL: config.IMG });

            await message.reply({ embeds: [embed] });

            // Sử dụng default seller đã tìm ở trên
            const seller = defaultSellerUser || `@${defaultSellerUsername}`;
            
            // Tạo embed yêu cầu feedback
            const feedbackEmbed = new EmbedBuilder()
                .setTitle('📝 Đơn Hàng Hoàn Thành')
                .setDescription([
                    `👋 Xin chào ${userMention}!`,
                    '',
                    '📦 **Thông tin đơn hàng:**',
                    `🆔 **Mã Đơn:** \`${orderId}\``,
                    `📋 **Tên Đơn Hàng:** ${orderName}`,
                    `💰 **Giá Tiền:** ${price.toLocaleString('vi-VN')}đ`,
                    '',
                    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
                    '',
                    '📌 **Vui lòng feedback theo đúng định dạng sau:**',
                    '```yaml',
                    `+1 legit ${seller} ${orderName}`,
                    '```',
                    '',
                    '⚠️ **Lưu ý quan trọng:**',
                    '✅ Feedback **Phải** đúng định dạng trên',
                    `👤 **Phải** tag tên người bán (${seller})`,
                    '👤 Khuyến khích feedback kèm theo với ảnh, không có ảnh vẫn được',
                    '❌ Không đúng định dạng hoặc không tag người bán → Feedback **KHÔNG HỢP LỆ**',
                    '',
                    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
                    '',
                    '🙏 Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi!'
                ].join('\n'))
                .setColor('#0099ff')
                .setThumbnail(userMention.displayAvatarURL({ dynamic: true }))
                .setTimestamp()
                .setFooter({ text: 'Iris Manager • Powered By Iris Studio', iconURL: config.IMG });

            // Gửi embed yêu cầu feedback vào kênh ticket
            try {
                await message.channel.send({
                    content: `${userMention}`,
                    embeds: [feedbackEmbed]
                });
                console.log(`✅ Đã gửi yêu cầu feedback vào kênh ticket cho đơn ${orderId}`);
            } catch (error) {
                console.error('⚠️ Không thể gửi yêu cầu feedback vào kênh ticket:', error.message);
            }

            // Gửi embed yêu cầu feedback vào DM của khách hàng
            try {
                await userMention.send({ embeds: [feedbackEmbed] });
                console.log(`✅ Đã gửi yêu cầu feedback vào DM của khách hàng ${userMention.username} cho đơn ${orderId}`);
            } catch (error) {
                console.error(`⚠️ Không thể gửi DM cho khách hàng ${userMention.username}:`, error.message);
            }

        } catch (error) {
            console.error('Error in addorder command:', error);
            await message.reply('❌ Đã xảy ra lỗi khi thêm đơn hàng.');
        }
    }
};

