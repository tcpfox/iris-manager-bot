const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const config = require('../../config.json');
const warrantyUtils = require('../../utils/warrantyUtils');
const { hasStaffRole } = require('../../utils/helpers');

const DB_PATH = path.join(__dirname, '../../database/orders.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('editorder')
        .setDescription('✏️ Sửa chế độ bảo hành của đơn hàng')
        .addStringOption(option =>
            option.setName('orderid')
                .setDescription('🔢 Mã đơn hàng cần sửa')
                .setRequired(true))
        .addBooleanOption(option =>
            option.setName('warranty')
                .setDescription('🛡️ Có bảo hành (true) hoặc không (false)')
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

            await interaction.deferReply({ ephemeral: false });

            const orderId = interaction.options.getString('orderid');
            const hasWarranty = interaction.options.getBoolean('warranty');

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
            const order = ordersData.orders.find(o => 
                o.orderId === orderId || o.orderId === `ORD${orderId}`
            );

            if (!order) {
                return await interaction.editReply({
                    content: `❌ Không tìm thấy đơn hàng với mã: \`${orderId}\``,
                    ephemeral: true
                });
            }

            // Store old value
            const oldHasWarranty = order.hasWarranty !== false;

            // Update warranty status
            order.hasWarranty = hasWarranty;
            
            // Update warrantyEligible based on hasWarranty
            if (!hasWarranty) {
                order.warrantyEligible = false;
            } else {
                // Nếu có bảo hành, cần kiểm tra lại điều kiện bảo hành
                const warrantyStatus = await warrantyUtils.getOrderWarrantyStatus(order.orderId);
                // Nếu đã feedback và trong deadline và chưa rời server thì có bảo hành
                if (order.hasFeedback && !order.leftServer) {
                    const purchaseDate = new Date(order.purchaseDate);
                    const feedbackDate = new Date(order.feedbackDate);
                    const hoursDiff = (feedbackDate - purchaseDate) / (1000 * 60 * 60);
                    const deadlineHours = config.WARRANTY?.FEEDBACK_DEADLINE_HOURS || 24;
                    
                    if (hoursDiff <= deadlineHours) {
                        order.warrantyEligible = true;
                    } else {
                        order.warrantyEligible = false;
                    }
                } else if (!order.hasFeedback && !order.leftServer) {
                    // Chưa feedback, kiểm tra deadline
                    const purchaseDate = new Date(order.purchaseDate);
                    const now = new Date();
                    const hoursDiff = (now - purchaseDate) / (1000 * 60 * 60);
                    const deadlineHours = config.WARRANTY?.FEEDBACK_DEADLINE_HOURS || 24;
                    
                    if (hoursDiff <= deadlineHours) {
                        order.warrantyEligible = true; // Còn thời gian feedback
                    } else {
                        order.warrantyEligible = false; // Quá deadline
                    }
                } else {
                    order.warrantyEligible = false;
                }
            }

            // Save to database
            await fs.writeFile(DB_PATH, JSON.stringify(ordersData, null, 4));

            // Try to get user info
            let userMention = null;
            try {
                const user = await interaction.client.users.fetch(order.userId);
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
                .setTitle('✅ Sửa Đơn Hàng Thành Công')
                .setDescription([
                    `**Mã Đơn:** \`${order.orderId}\``,
                    `**Khách Hàng:** ${userMention}`,
                    `**Tên Đơn Hàng:** ${order.orderName}`,
                    `**Giá Tiền:** ${order.price ? order.price.toLocaleString('vi-VN') + 'đ' : 'N/A'}`,
                    `**Ngày Mua:** ${formattedDate}`,
                    '',
                    `**Bảo Hành:** ${oldHasWarranty ? '✅ Có' : '❌ Không'} → ${hasWarranty ? '✅ Có' : '❌ Không'}`,
                    '',
                    'Đơn hàng đã được cập nhật!',
                    hasWarranty ? '' : '⚠️ **Lưu ý:** Mặt hàng này không có bảo hành, nhưng feedback vẫn là bắt buộc.'
                ].join('\n'))
                .setColor('#00ff00')
                .setTimestamp()
                .setFooter({ text: 'Iris Market • Quản lý đơn hàng', iconURL: config.IMG });

            await interaction.editReply({
                embeds: [embed]
            });

        } catch (error) {
            console.error('Error in editorder command:', error);
            await interaction.editReply({
                content: '❌ Đã xảy ra lỗi khi sửa đơn hàng.',
                ephemeral: true
            });
        }
    }
};

