const { EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const config = require('../../config.json');
const warrantyUtils = require('../../utils/warrantyUtils');

const DB_PATH = path.join(__dirname, '../../database/orders.json');

module.exports = {
    name: 'checkorder',
    description: 'Kiểm tra thông tin đơn hàng theo mã',
    usage: 'checkorder <mã đơn hàng>',
    aliases: ['co', 'checko', 'orderinfo'],
    
    async execute(message, args) {
        try {
            if (args.length === 0) {
                return message.reply('❌ Vui lòng nhập mã đơn hàng! Sử dụng: `checkorder <mã đơn hàng>`');
            }

            const orderId = args[0];

            // Read existing orders
            let ordersData;
            try {
                const data = await fs.readFile(DB_PATH, 'utf8');
                ordersData = JSON.parse(data);
            } catch (error) {
                return message.reply('❌ Không tìm thấy database đơn hàng!');
            }

            // Find order
            const order = ordersData.orders.find(o => 
                o.orderId === orderId || o.orderId === `ORD${orderId}`
            );

            if (!order) {
                return message.reply(`❌ Không tìm thấy đơn hàng với mã: \`${orderId}\``);
            }

            // Format dates for display
            const purchaseDate = new Date(order.purchaseDate);
            const addedAtDate = new Date(order.addedAt);
            const formattedPurchaseDate = purchaseDate.toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            const formattedAddedDate = addedAtDate.toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            // Try to get user info
            let userMention = null;
            try {
                const user = await message.client.users.fetch(order.userId);
                userMention = user.toString();
            } catch (error) {
                userMention = `${order.username} (ID: ${order.userId})`;
            }

            // Try to get added by user info
            let addedByMention = null;
            try {
                const addedByUser = await message.client.users.fetch(order.addedBy);
                addedByMention = addedByUser.toString();
            } catch (error) {
                addedByMention = `ID: ${order.addedBy}`;
            }

            // Extract order ID for display (remove ORD prefix if exists)
            let orderIdDisplay = order.orderId;
            if (orderIdDisplay.startsWith('ORD')) {
                const timestampMatch = orderIdDisplay.match(/ORD(\d+)/);
                orderIdDisplay = timestampMatch ? timestampMatch[1] : orderIdDisplay.replace('ORD', '');
            }

            // Lấy thông tin bảo hành
            const warrantyStatus = await warrantyUtils.getOrderWarrantyStatus(order.orderId);

            const embed = new EmbedBuilder()
                .setTitle('🔍 Thông Tin Đơn Hàng')
                .setDescription([
                    `**Mã Đơn:** \`#${orderIdDisplay}\` (${order.orderId})`,
                    `**Khách Hàng:** ${userMention}`,
                    `**Tên Đơn Hàng:** ${order.orderName}`,
                    `**Giá Tiền:** ${order.price ? order.price.toLocaleString('vi-VN') + '₫' : 'N/A'}`,
                    `**Ngày Mua:** ${formattedPurchaseDate}`,
                    `**Người Thêm:** ${addedByMention}`,
                    `**Thời Gian Thêm:** ${formattedAddedDate}`
                ].join('\n'))
                .setColor('#1a73e8')
                .setTimestamp()
                .setFooter({ text: 'Iris Market • Kiểm tra đơn hàng', iconURL: config.IMG });

            // Thêm thông tin bảo hành
            if (warrantyStatus) {
                let warrantyColor = '#00ff00';
                const deadlineHours = config.WARRANTY?.FEEDBACK_DEADLINE_HOURS || 24;

                // Field 1: Trạng Thái Bảo Hành (chỉ hiển thị trạng thái hiện tại)
                let warrantyStatusText = [];
                
                // Hiển thị thông tin mặt hàng có bảo hành hay không
                if (warrantyStatus.hasWarranty === false) {
                    warrantyStatusText.push('⚠️ **Mặt hàng không nhận bảo hành**');
                    warrantyColor = '#ffaa00';
                } else if (warrantyStatus.warrantyEligible) {
                    warrantyStatusText.push('✅ **CÓ BẢO HÀNH**');
                } else {
                    warrantyStatusText.push('❌ **KHÔNG CÓ BẢO HÀNH**');
                    warrantyColor = '#ff0000';
                }

                embed.addFields({
                    name: '🛡️ Trạng Thái Bảo Hành',
                    value: warrantyStatusText.join('\n'),
                    inline: false
                });

                // Field 2: Lịch Sử Trạng Thái
                let historyText = [];

                // Trạng thái feedback
                if (warrantyStatus.hasFeedback && warrantyStatus.feedbackDate) {
                    const feedbackDate = new Date(warrantyStatus.feedbackDate);
                    const formattedFeedbackDate = feedbackDate.toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                    historyText.push(`✅ **Đã feedback:** ${formattedFeedbackDate}`);
                } else {
                    if (warrantyStatus.hoursRemaining > 0) {
                        historyText.push(`⏳ **Chưa feedback** (Còn ${warrantyStatus.hoursRemaining} giờ)`);
                    } else if (warrantyStatus.isOverdue) {
                        historyText.push(`❌ **Chưa feedback** (Quá hạn)`);
                    } else {
                        historyText.push(`⏳ **Chưa feedback**`);
                    }
                }

                historyText.push('');

                // Trạng thái user
                if (warrantyStatus.leftServer) {
                    const leftDate = new Date(warrantyStatus.leftDate);
                    const formattedLeftDate = leftDate.toLocaleDateString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                    });
                    historyText.push(`❌ **User đã rời server** (${formattedLeftDate})`);
                } else {
                    historyText.push(`✅ **User đang ở trong server**`);
                }

                // Lý do không bảo hành
                if (!warrantyStatus.warrantyEligible) {
                    historyText.push('');
                    historyText.push('⚠️ **Lý do:**');
                    if (warrantyStatus.hasWarranty === false) {
                        historyText.push('• Mặt hàng không nhận bảo hành');
                    }
                    if (!warrantyStatus.hasFeedback && warrantyStatus.isOverdue && warrantyStatus.hasWarranty !== false) {
                        historyText.push(`• Không feedback trong thời hạn ${deadlineHours} giờ`);
                    }
                    if (warrantyStatus.leftServer && warrantyStatus.hasWarranty !== false) {
                        historyText.push('• User đã rời server');
                    }
                }

                embed.addFields({
                    name: '📋 Lịch Sử Trạng Thái',
                    value: historyText.join('\n'),
                    inline: false
                });

                // Đổi màu embed nếu không có bảo hành
                if (!warrantyStatus.warrantyEligible) {
                    embed.setColor(warrantyColor);
                }
            }

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in checkorder command:', error);
            await message.reply('❌ Đã xảy ra lỗi khi kiểm tra đơn hàng.');
        }
    }
};

