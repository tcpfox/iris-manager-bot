const { EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const config = require('../../config.json');
const warrantyUtils = require('../../utils/warrantyUtils');

const DB_PATH = path.join(__dirname, '../../database/orders.json');

module.exports = {
    name: 'restorewarranty',
    description: 'Khôi phục bảo hành cho đơn hàng đã mất bảo hành',
    usage: 'restorewarranty <mã đơn hàng>',
    aliases: ['rw', 'restorew', 'fixwarranty'],
    
    async execute(message, args) {
        try {
            if (args.length < 1) {
                return message.reply('❌ Vui lòng nhập mã đơn hàng! Sử dụng: `restorewarranty <mã đơn hàng>`');
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

            // Kiểm tra xem đơn hàng có phải là mặt hàng có bảo hành không
            if (order.hasWarranty === false) {
                return message.reply(`❌ Đơn hàng này là mặt hàng không nhận bảo hành. Không thể khôi phục bảo hành cho mặt hàng này.\nSử dụng \`!editorder\` để thay đổi chế độ bảo hành của mặt hàng.`);
            }

            // Kiểm tra xem đơn hàng đã có bảo hành chưa
            if (order.warrantyEligible === true) {
                return message.reply(`ℹ️ Đơn hàng này đã có bảo hành rồi!`);
            }

            // Lưu trạng thái cũ để hiển thị
            const oldWarrantyEligible = order.warrantyEligible;
            const oldHasFeedback = order.hasFeedback;
            const oldLeftServer = order.leftServer;

            // Khôi phục bảo hành
            order.warrantyEligible = true;

            // Save to database
            await fs.writeFile(DB_PATH, JSON.stringify(ordersData, null, 4));

            // Try to get user info
            let userMention = null;
            try {
                const user = await message.client.users.fetch(order.userId);
                userMention = user.toString();
            } catch (error) {
                userMention = `${order.username} (ID: ${order.userId})`;
            }

            // Format date for display
            const purchaseDate = new Date(order.purchaseDate);
            const formattedDate = purchaseDate.toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });

            // Tạo thông báo lý do mất bảo hành (nếu có)
            let reasonText = [];
            if (!oldHasFeedback) {
                reasonText.push('• Chưa feedback trong thời hạn');
            }
            if (oldLeftServer) {
                reasonText.push('• User đã rời server');
            }

            const embed = new EmbedBuilder()
                .setTitle('✅ Khôi Phục Bảo Hành Thành Công')
                .setDescription([
                    `**Mã Đơn:** \`${order.orderId}\``,
                    `**Khách Hàng:** ${userMention}`,
                    `**Tên Đơn Hàng:** ${order.orderName}`,
                    `**Giá Tiền:** ${order.price ? order.price.toLocaleString('vi-VN') + 'đ' : 'N/A'}`,
                    `**Ngày Mua:** ${formattedDate}`,
                    '',
                    `**Trạng Thái:** ❌ Không có bảo hành → ✅ Có bảo hành`,
                    reasonText.length > 0 ? `\n**Lý do mất bảo hành trước đó:**\n${reasonText.join('\n')}` : '',
                    '',
                    '🛡️ **Đơn hàng đã được khôi phục bảo hành!**'
                ].join('\n'))
                .setColor('#00ff00')
                .setTimestamp()
                .setFooter({ text: 'Iris Market • Quản lý bảo hành', iconURL: config.IMG });

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in restorewarranty command:', error);
            await message.reply('❌ Đã xảy ra lỗi khi khôi phục bảo hành.');
        }
    }
};

