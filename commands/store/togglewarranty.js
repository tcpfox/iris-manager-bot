const { EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const config = require('../../config.json');
const warrantyUtils = require('../../utils/warrantyUtils');
const { hasStaffRole } = require('../../utils/helpers');

const DB_PATH = path.join(__dirname, '../../database/orders.json');

module.exports = {
    name: 'togglewarranty',
    description: 'Chuyển đổi trạng thái bảo hành (có ↔ không)',
    usage: 'togglewarranty <mã đơn hàng>',
    aliases: ['tw', 'togglew', 'switchwarranty'],
    
    async execute(message, args) {
        try {
            // Kiểm tra quyền staff
            const member = await message.guild.members.fetch(message.author.id);
            if (!hasStaffRole(member)) {
                return message.reply('❌ Chỉ có staff mới có thể sử dụng lệnh này!');
            }

            if (args.length < 1) {
                return message.reply('❌ Vui lòng nhập mã đơn hàng! Sử dụng: `togglewarranty <mã đơn hàng>`');
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

            // Lưu trạng thái cũ
            const oldWarrantyEligible = order.warrantyEligible !== false;
            
            // Chuyển đổi trạng thái: nếu đang có thì thành không, nếu đang không thì thành có
            const newWarrantyEligible = !oldWarrantyEligible;
            order.warrantyEligible = newWarrantyEligible;

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

            const embed = new EmbedBuilder()
                .setTitle('✅ Chuyển Đổi Trạng Thái Bảo Hành Thành Công')
                .setDescription([
                    `**Mã Đơn:** \`${order.orderId}\``,
                    `**Khách Hàng:** ${userMention}`,
                    `**Tên Đơn Hàng:** ${order.orderName}`,
                    `**Giá Tiền:** ${order.price ? order.price.toLocaleString('vi-VN') + 'đ' : 'N/A'}`,
                    `**Ngày Mua:** ${formattedDate}`,
                    '',
                    `**Trạng Thái:** ${oldWarrantyEligible ? '✅ Có bảo hành' : '❌ Không có bảo hành'} → ${newWarrantyEligible ? '✅ Có bảo hành' : '❌ Không có bảo hành'}`,
                    '',
                    '🔄 **Trạng thái bảo hành đã được chuyển đổi!**'
                ].join('\n'))
                .setColor(newWarrantyEligible ? '#00ff00' : '#ff0000')
                .setTimestamp()
                .setFooter({ text: 'Iris Market • Quản lý bảo hành', iconURL: config.IMG });

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in togglewarranty command:', error);
            await message.reply('❌ Đã xảy ra lỗi khi chuyển đổi trạng thái bảo hành.');
        }
    }
};

