const { EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const config = require('../../config.json');
const { hasStaffRole } = require('../../utils/helpers');

const DB_PATH = path.join(__dirname, '../../database/orders.json');

module.exports = {
    name: 'delorder',
    description: 'Xóa đơn hàng của khách hàng',
    usage: 'delorder <mã đơn hàng>',
    aliases: ['do', 'delo'],
    
    async execute(message, args) {
        try {
            // Kiểm tra quyền staff
            const member = await message.guild.members.fetch(message.author.id);
            if (!hasStaffRole(member)) {
                return message.reply('❌ Chỉ có staff mới có thể sử dụng lệnh này!');
            }

            if (args.length === 0) {
                return message.reply('❌ Vui lòng nhập mã đơn hàng! Sử dụng: `delorder <mã đơn hàng>`');
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
            const orderIndex = ordersData.orders.findIndex(order => 
                order.orderId === orderId
            );

            if (orderIndex === -1) {
                return message.reply(`❌ Không tìm thấy đơn hàng với mã: \`${orderId}\``);
            }

            const deletedOrder = ordersData.orders[orderIndex];

            // Remove order
            ordersData.orders.splice(orderIndex, 1);
            await fs.writeFile(DB_PATH, JSON.stringify(ordersData, null, 4));

            // Format date for display
            const purchaseDate = new Date(deletedOrder.purchaseDate);
            const formattedDate = purchaseDate.toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });

            const embed = new EmbedBuilder()
                .setTitle('✅ Xóa Đơn Hàng Thành Công')
                .setDescription([
                    `**Mã Đơn:** \`${deletedOrder.orderId}\``,
                    `**Khách Hàng:** ${deletedOrder.username}`,
                    `**Tên Đơn Hàng:** ${deletedOrder.orderName}`,
                    `**Giá Tiền:** ${deletedOrder.price.toLocaleString('vi-VN')}đ`,
                    `**Ngày Mua:** ${formattedDate}`,
                    '',
                    'Đơn hàng đã được xóa khỏi hệ thống!'
                ].join('\n'))
                .setColor('#ff0000')
                .setTimestamp()
                .setFooter({ text: 'Iris Market • Quản lý đơn hàng', iconURL: config.IMG });

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in delorder command:', error);
            await message.reply('❌ Đã xảy ra lỗi khi xóa đơn hàng.');
        }
    }
};

