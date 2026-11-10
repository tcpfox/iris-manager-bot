const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const config = require('../../config.json');
const { hasStaffRole } = require('../../utils/helpers');

const DB_PATH = path.join(__dirname, '../../database/orders.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('delorder')
        .setDescription('🗑️ Xóa đơn hàng của khách hàng')
        .addStringOption(option =>
            option.setName('orderid')
                .setDescription('🔢 Mã đơn hàng cần xóa')
                .setRequired(true)),

    async execute(interaction) {
        try {
            // Kiểm tra quyền staff
            const member = await interaction.guild.members.fetch(interaction.user.id);
            if (!hasStaffRole(member)) {
                return await interaction.reply({
                    content: '❌ Chỉ có staff mới có thể sử dụng lệnh này!',
                    ephemeral: true
                });
            }

            await interaction.deferReply({ ephemeral: true });

            const orderId = interaction.options.getString('orderid');

            // Read existing orders
            let ordersData;
            try {
                const data = await fs.readFile(DB_PATH, 'utf8');
                ordersData = JSON.parse(data);
            } catch (error) {
                return await interaction.editReply({
                    content: '❌ Không tìm thấy database đơn hàng!',
                    ephemeral: true
                });
            }

            // Find order
            const orderIndex = ordersData.orders.findIndex(order => 
                order.orderId === orderId
            );

            if (orderIndex === -1) {
                return await interaction.editReply({
                    content: `❌ Không tìm thấy đơn hàng với mã: \`${orderId}\``,
                    ephemeral: true
                });
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

            await interaction.editReply({
                embeds: [embed]
            });

        } catch (error) {
            console.error('Error in delorder command:', error);
            await interaction.editReply({
                content: '❌ Đã xảy ra lỗi khi xóa đơn hàng.',
                ephemeral: true
            });
        }
    }
};

