const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const config = require('../../config.json');
const warrantyUtils = require('../../utils/warrantyUtils');

const DB_PATH = path.join(__dirname, '../../database/orders.json');

// Helper function to format time ago in Vietnamese
function formatTimeAgo(date) {
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (years > 0) {
        return `${years} năm trước`;
    } else if (months > 0) {
        return `${months} tháng trước`;
    } else if (days > 0) {
        return `${days} ngày trước`;
    } else if (hours > 0) {
        return `${hours} giờ trước`;
    } else if (minutes > 0) {
        return `${minutes} phút trước`;
    } else {
        return 'Vừa xong';
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('ℹ️ Xem thông tin khách hàng')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('👤 Khách hàng cần xem thông tin (để trống để xem thông tin của bạn)')
                .setRequired(false)),

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: false });

            // Get user from option or default to command invoker
            const user = interaction.options.getUser('user') || interaction.user;

            // Get member info
            let member;
            let joinedAt = null;
            let highestRole = null;
            try {
                member = await interaction.guild.members.fetch(user.id);
                joinedAt = member.joinedAt;
                highestRole = member.roles.highest;
            } catch (error) {
                // User might not be in the server
            }

            // Read existing orders
            let ordersData;
            try {
                const data = await fs.readFile(DB_PATH, 'utf8');
                ordersData = JSON.parse(data);
            } catch (error) {
                ordersData = { orders: [] };
            }

            // Filter orders by user
            const userOrders = ordersData.orders.filter(order => 
                order.userId === user.id
            ).sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate)); // Sort by date, newest first

            // Calculate statistics
            const totalSpent = userOrders.reduce((sum, order) => {
                const price = order.price || 0;
                return sum + price;
            }, 0);
            const orderCount = userOrders.length;

            // Tính thống kê bảo hành
            let warrantyStats = {
                withWarranty: 0,
                withoutWarranty: 0,
                noWarrantyProduct: 0 // Mặt hàng không nhận bảo hành
            };

            for (const order of userOrders) {
                const warrantyStatus = await warrantyUtils.getOrderWarrantyStatus(order.orderId);
                if (warrantyStatus) {
                    if (warrantyStatus.hasWarranty === false) {
                        warrantyStats.noWarrantyProduct++;
                    } else if (warrantyStatus.warrantyEligible) {
                        warrantyStats.withWarranty++;
                    } else {
                        warrantyStats.withoutWarranty++;
                    }
                } else {
                    warrantyStats.withoutWarranty++;
                }
            }

            // Format time ago
            const accountCreatedAgo = formatTimeAgo(user.createdAt);
            const joinedAgo = joinedAt ? formatTimeAgo(joinedAt) : 'Không xác định';

            // Create embed
            const embed = new EmbedBuilder()
                .setTitle(`Thông tin của ${user.username}`)
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .setColor('#1a73e8')
                .setTimestamp()
                .setFooter({ text: 'Iris Market', iconURL: config.IMG });

            // Thông Tin Cơ Bản
            embed.addFields({
                name: '👤 Thông Tin Cơ Bản',
                value: [
                    `**Tên:** ${user.username}`,
                    `**ID:**  ${user.id}`,
                    `**Tham gia server:**  ${joinedAgo}`
                ].join('\n'),
                inline: false
            });

            // Thống Kê Mua Hàng và Vai Trò Cao Nhất (inline - nằm kế bên nhau)
            // Thêm cả hai field cùng lúc để đảm bảo chúng nằm ngang
            const statsAndRoleFields = [
                {
                    name: '**💰 Thống Kê Mua Hàng** ',
                    value: [
                        `**Tổng chi tiêu:**  ${totalSpent.toLocaleString('vi-VN')}₫`,
                        `**Đơn hàng đã mua:**  ${orderCount}`
                    ].join('\n'),
                    inline: true
                },
                {
                    name: '**👑 Vai Trò Cao Nhất** ',
                    value: (highestRole && highestRole.id !== interaction.guild.id) 
                        ? highestRole.toString() 
                        : '@.',
                    inline: true
                }
            ];
            
            embed.addFields(statsAndRoleFields);

            // Thống Kê Bảo Hành
            if (orderCount > 0) {
                const warrantyPercentage = orderCount > 0 
                    ? Math.round((warrantyStats.withWarranty / orderCount) * 100) 
                    : 0;
                
                const statsText = [
                    `**Đơn có bảo hành:** ${warrantyStats.withWarranty}`,
                    `**Đơn không bảo hành:** ${warrantyStats.withoutWarranty}`
                ];
                
                if (warrantyStats.noWarrantyProduct > 0) {
                    statsText.push(`**Mặt hàng không nhận bảo hành:** ${warrantyStats.noWarrantyProduct}`);
                }
                
                statsText.push(`**Tỷ lệ:** ${warrantyPercentage}%`);
                
                embed.addFields({
                    name: '**🛡️ Thống Kê Bảo Hành** ',
                    value: statsText.join('\n'),
                    inline: false
                });
            }

            // Đơn Hàng Gần Đây
            if (userOrders.length > 0) {
                const displayOrders = userOrders.slice(0, 10); // Show 10 most recent
                const ordersList = await Promise.all(displayOrders.map(async (order) => {
                    // Display full order ID like in addorder command
                    const priceText = order.price ? `${order.price.toLocaleString('vi-VN')}₫` : 'N/A';
                    const warrantyStatus = await warrantyUtils.getOrderWarrantyStatus(order.orderId);
                    let warrantyIcon = '❌';
                    if (warrantyStatus) {
                        if (warrantyStatus.hasWarranty === false) {
                            warrantyIcon = '⚠️'; // Mặt hàng không nhận bảo hành
                        } else if (warrantyStatus.warrantyEligible) {
                            warrantyIcon = '✅'; // Có bảo hành
                        }
                    }
                    return `${warrantyIcon} \`${order.orderId}\` - ${order.orderName} - ${priceText}`;
                }));

                embed.addFields({
                    name: '**🛍️ Lịch Sử Mua Hàng** ',
                    value: ordersList.join('\n'),
                    inline: false
                });
            } else {
                embed.addFields({
                    name: '**🛍️ Lịch Sử Mua Hàng** ',
                    value: 'Chưa có đơn hàng nào',
                    inline: false
                });
            }

            await interaction.editReply({
                embeds: [embed]
            });

        } catch (error) {
            console.error('Error in info command:', error);
            await interaction.editReply({
                content: '❌ Đã xảy ra lỗi khi xem thông tin khách hàng.',
                ephemeral: true
            });
        }
    }
};

