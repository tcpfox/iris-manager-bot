const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const config = require('../../config.json');

const DB_PATH = path.join(__dirname, '../../database/orders.json');
const ITEMS_PER_PAGE = 10; // Số khách hàng mỗi trang

module.exports = {
    name: 'leaderboard',
    description: 'Xem bảng xếp hạng chi tiêu của khách hàng',
    usage: 'leaderboard',
    aliases: ['lb', 'top', 'ranking', 'bxh'],
    
    async execute(message, args) {
        try {
            // Đọc dữ liệu đơn hàng
            let ordersData;
            try {
                const data = await fs.readFile(DB_PATH, 'utf8');
                ordersData = JSON.parse(data);
            } catch (error) {
                return message.reply('❌ Không thể đọc dữ liệu đơn hàng!');
            }

            const orders = ordersData.orders || [];

            // Tính toán thống kê tổng
            const totalOrders = orders.length;
            const uniqueCustomers = new Set(orders.map(order => order.userId)).size;
            const totalRevenue = orders.reduce((sum, order) => {
                const price = order.price || 0;
                return sum + price;
            }, 0);

            // Tính tổng tiền mỗi khách hàng
            const customerStats = new Map();

            for (const order of orders) {
                const userId = order.userId;
                const username = order.username || 'Unknown';
                const price = order.price || 0;

                if (!customerStats.has(userId)) {
                    customerStats.set(userId, {
                        userId: userId,
                        username: username,
                        totalSpent: 0,
                        orderCount: 0
                    });
                }

                const stats = customerStats.get(userId);
                stats.totalSpent += price;
                stats.orderCount += 1;
            }

            // Chuyển Map thành Array và sắp xếp theo tổng tiền giảm dần
            const sortedCustomers = Array.from(customerStats.values())
                .sort((a, b) => b.totalSpent - a.totalSpent);

            const totalPages = Math.ceil(sortedCustomers.length / ITEMS_PER_PAGE) || 1;
            let currentPage = 1;

            // Hàm tạo embed cho trang hiện tại
            const createEmbed = (page) => {
                const startIndex = (page - 1) * ITEMS_PER_PAGE;
                const endIndex = startIndex + ITEMS_PER_PAGE;
                const pageCustomers = sortedCustomers.slice(startIndex, endIndex);

                const embed = new EmbedBuilder()
                    .setColor(config.COLORS.INFO)
                    .setTitle('🏆 Bảng Xếp Hạng Chi Tiêu')
                    // .setDescription('✨ **Xem ai là khách hàng chi tiêu nhiều nhất tại shop!** ✨')
                    .setTimestamp();

                // Thêm thống kê tổng với format đẹp hơn
                embed.addFields({
                    name: '📊 **Thống Kê Tổng Quan**',
                    value: [
                        `👥 **Tổng khách hàng:** \`${uniqueCustomers.toLocaleString('vi-VN')}\``,
                        `📦 **Tổng đơn hàng:** \`${totalOrders.toLocaleString('vi-VN')}\``,
                        `💰 **Tổng doanh thu:** \`${totalRevenue.toLocaleString('vi-VN')}₫\``
                    ].join('\n'),
                    inline: false
                });

                // Tạo danh sách leaderboard cho trang hiện tại
                if (pageCustomers.length === 0) {
                    embed.addFields({
                        name: '📋 **Danh Sách Khách Hàng**',
                        value: '❌ Chưa có dữ liệu chi tiêu nào!',
                        inline: false
                    });
                } else {
                    const leaderboardList = pageCustomers.map((customer, index) => {
                        const globalIndex = startIndex + index;
                        const medal = globalIndex === 0 ? '🥇' : globalIndex === 1 ? '🥈' : globalIndex === 2 ? '🥉' : `\`${globalIndex + 1}.\``;
                        const username = customer.username.length > 25 
                            ? customer.username.substring(0, 22) + '...' 
                            : customer.username;
                        const totalSpentFormatted = customer.totalSpent.toLocaleString('vi-VN');
                        const orderCountFormatted = customer.orderCount.toLocaleString('vi-VN');
                        return `${medal} **${username}**\n   💵 **Chi tiêu:** \`${totalSpentFormatted}₫\` • 📦 **Đơn hàng:** \`${orderCountFormatted} đơn\``;
                    }).join('\n\n');

                    embed.addFields({
                        name: '📋 **Danh Sách Khách Hàng**',
                        value: leaderboardList,
                        inline: false
                    });
                }

                // Footer với thông tin trang
                embed.setFooter({ 
                    text: `📄 Trang ${page}/${totalPages} • Iris Market`, 
                    iconURL: config.IMG 
                });

                return embed;
            };

            // Tạo buttons
            const createButtons = (page) => {
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId('lb_prev')
                            .setLabel('Trước')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('◀️')
                            .setDisabled(page === 1),
                        new ButtonBuilder()
                            .setCustomId('lb_next')
                            .setLabel('Sau')
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji('▶️')
                            .setDisabled(page === totalPages)
                    );
                return row;
            };

            // Gửi embed đầu tiên
            const embed = createEmbed(currentPage);
            const buttons = createButtons(currentPage);
            const reply = await message.reply({ embeds: [embed], components: [buttons] });

            // Tạo collector cho button interactions
            const filter = (i) => {
                return (i.customId === 'lb_prev' || i.customId === 'lb_next') && 
                       i.user.id === message.author.id;
            };

            const collector = reply.createMessageComponentCollector({ 
                filter, 
                time: 300000 // 5 phút
            });

            collector.on('collect', async (i) => {
                await i.deferUpdate();

                if (i.customId === 'lb_prev') {
                    if (currentPage > 1) {
                        currentPage--;
                    }
                } else if (i.customId === 'lb_next') {
                    if (currentPage < totalPages) {
                        currentPage++;
                    }
                }

                const newEmbed = createEmbed(currentPage);
                const newButtons = createButtons(currentPage);
                await i.editReply({ embeds: [newEmbed], components: [newButtons] });
            });

            collector.on('end', async () => {
                try {
                    const disabledButtons = createButtons(currentPage);
                    disabledButtons.components.forEach(btn => btn.setDisabled(true));
                    await reply.edit({ components: [disabledButtons] });
                } catch (error) {
                    // Message có thể đã bị xóa
                }
            });

        } catch (error) {
            console.error('Error in leaderboard command:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor(config.COLORS.ERROR)
                .setTitle('❌ Lỗi')
                .setDescription('Đã xảy ra lỗi khi tải bảng xếp hạng!')
                .setTimestamp()
                .setFooter({ 
                    text: 'Iris Market', 
                    iconURL: config.IMG 
                });
            
            await message.reply({ embeds: [errorEmbed] });
        }
    },
};

