const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const config = require('../../config.json');

const DB_PATH = path.join(__dirname, '../../database/orders.json');

// Regex để phát hiện URL hình ảnh
const IMAGE_URL_REGEX = /(https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|bmp|svg))/i;

module.exports = {
    data: new SlashCommandBuilder()
        .setName('backupvouch')
        .setDescription('📦 Backup tất cả vouches từ orders.json vào kênh feedback (Owner only)'),
    
    async execute(interaction) {
        // Kiểm tra quyền owner
        if (interaction.user.id !== config.OWNER_ID) {
            return interaction.reply({
                content: '❌ Chỉ có owner mới có thể sử dụng lệnh này!',
                ephemeral: true
            });
        }

        // Kiểm tra config
        if (!config.BACKUP_FEEDBACK_CHANNEL) {
            return interaction.reply({
                content: '❌ Không tìm thấy BACKUP_FEEDBACK_CHANNEL trong config.json!',
                ephemeral: true
            });
        }

        if (!config.BACKUP_TAG_USERNAME) {
            return interaction.reply({
                content: '❌ Không tìm thấy BACKUP_TAG_USERNAME trong config.json!',
                ephemeral: true
            });
        }

        await interaction.deferReply({ ephemeral: false });

        try {
            // Đọc file orders.json
            const ordersData = await fs.readFile(DB_PATH, 'utf8');
            const orders = JSON.parse(ordersData);

            if (!orders.orders || orders.orders.length === 0) {
                return interaction.editReply({
                    content: '❌ Không có orders nào trong database!'
                });
            }

            // Lấy kênh feedback
            const feedbackChannel = await interaction.client.channels.fetch(config.BACKUP_FEEDBACK_CHANNEL);
            if (!feedbackChannel) {
                return interaction.editReply({
                    content: '❌ Không tìm thấy kênh feedback!'
                });
            }

            // Tìm user để tag từ username trong config
            let tagUserId = null;
            try {
                // Thử tìm user trong guild bằng username
                const guild = feedbackChannel.guild;
                if (guild) {
                    const members = await guild.members.fetch();
                    const member = members.find(m => 
                        m.user.username.toLowerCase() === config.BACKUP_TAG_USERNAME.toLowerCase() ||
                        m.displayName.toLowerCase() === config.BACKUP_TAG_USERNAME.toLowerCase() ||
                        m.user.globalName?.toLowerCase() === config.BACKUP_TAG_USERNAME.toLowerCase()
                    );
                    if (member) {
                        tagUserId = member.user.id;
                    }
                }
                
                // Nếu không tìm thấy trong guild, thử tìm trong user cache
                if (!tagUserId) {
                    const users = interaction.client.users.cache;
                    const cachedUser = users.find(u => 
                        u.username.toLowerCase() === config.BACKUP_TAG_USERNAME.toLowerCase() ||
                        u.globalName?.toLowerCase() === config.BACKUP_TAG_USERNAME.toLowerCase()
                    );
                    if (cachedUser) {
                        tagUserId = cachedUser.id;
                    }
                }

                if (tagUserId) {
                    console.log(`✅ Đã tìm thấy user để tag: ${config.BACKUP_TAG_USERNAME} (${tagUserId})`);
                } else {
                    console.log(`⚠️ Không tìm thấy user để tag: ${config.BACKUP_TAG_USERNAME}, sẽ dùng text thay thế`);
                }
            } catch (error) {
                console.log(`⚠️ Lỗi khi tìm user để tag: ${error.message}`);
            }

            // Tạo hoặc lấy webhook
            let webhook;
            const webhooks = await feedbackChannel.fetchWebhooks();
            const existingWebhook = webhooks.find(w => w.name === 'Backup Vouch Bot');

            if (existingWebhook) {
                webhook = existingWebhook;
            } else {
                webhook = await feedbackChannel.createWebhook({
                    name: 'Backup Vouch Bot',
                    avatar: interaction.client.user.displayAvatarURL()
                });
            }

            const totalOrders = orders.orders.length;
            let successCount = 0;
            let failedCount = 0;

            // Embed cập nhật tiến trình
            const progressEmbed = new EmbedBuilder()
                .setTitle('📦 Đang Backup Vouches...')
                .setDescription(`Đang xử lý: **0/${totalOrders}** orders`)
                .setColor(config.COLORS.INFO)
                .setTimestamp()
                .setFooter({ text: 'Iris Market • Backup System', iconURL: config.IMG });

            const progressMessage = await interaction.editReply({ embeds: [progressEmbed] });

            // Xử lý từng order
            for (let i = 0; i < totalOrders; i++) {
                const order = orders.orders[i];
                
                try {
                    // Lấy thông tin user từ userId
                    let user;
                    let avatarURL;
                    let username;

                    try {
                        user = await interaction.client.users.fetch(order.userId);
                        avatarURL = user.displayAvatarURL({ dynamic: true, size: 256 });
                        username = user.username;
                    } catch (error) {
                        // Nếu không fetch được user, dùng thông tin từ order
                        avatarURL = `https://cdn.discordapp.com/embed/avatars/${parseInt(order.userId) % 5}.png`;
                        username = order.username || 'Unknown User';
                    }

                    // Tạo nội dung message với mention thực sự
                    const mentionText = tagUserId ? `<@${tagUserId}>` : `@${config.BACKUP_TAG_USERNAME}`;
                    const content = `+1 legit ${mentionText} ${order.orderName}`;

                    // Kiểm tra xem có URL hình ảnh trong orderName không
                    const imageMatch = order.orderName.match(IMAGE_URL_REGEX);
                    const imageURL = imageMatch ? imageMatch[0] : null;

                    // Chuẩn bị options cho webhook
                    const webhookOptions = {
                        content: content,
                        username: username,
                        avatarURL: avatarURL
                    };

                    // Nếu có URL hình ảnh, thêm vào embed
                    if (imageURL) {
                        const imageEmbed = new EmbedBuilder()
                            .setImage(imageURL);
                        webhookOptions.embeds = [imageEmbed];
                    }

                    // Gửi message qua webhook
                    await webhook.send(webhookOptions);

                    successCount++;

                    // Cập nhật embed tiến trình mỗi 10 orders hoặc order cuối cùng
                    if ((i + 1) % 10 === 0 || i === totalOrders - 1) {
                        const updatedEmbed = new EmbedBuilder()
                            .setTitle('📦 Đang Backup Vouches...')
                            .setDescription([
                                `Đang xử lý: **${i + 1}/${totalOrders}** orders`,
                                `✅ Thành công: **${successCount}**`,
                                `❌ Thất bại: **${failedCount}**`,
                                `📊 Tiến độ: **${Math.round(((i + 1) / totalOrders) * 100)}%**`
                            ].join('\n'))
                            .setColor(config.COLORS.INFO)
                            .setTimestamp()
                            .setFooter({ text: 'Iris Market • Backup System', iconURL: config.IMG });

                        await progressMessage.edit({ embeds: [updatedEmbed] });
                    }

                    // Delay 1 giây để tránh rate limit
                    await new Promise(resolve => setTimeout(resolve, 1000));

                } catch (error) {
                    console.error(`❌ Lỗi khi backup order ${order.orderId}:`, error);
                    failedCount++;

                    // Vẫn cập nhật tiến trình
                    if ((i + 1) % 10 === 0 || i === totalOrders - 1) {
                        const updatedEmbed = new EmbedBuilder()
                            .setTitle('📦 Đang Backup Vouches...')
                            .setDescription([
                                `Đang xử lý: **${i + 1}/${totalOrders}** orders`,
                                `✅ Thành công: **${successCount}**`,
                                `❌ Thất bại: **${failedCount}**`,
                                `📊 Tiến độ: **${Math.round(((i + 1) / totalOrders) * 100)}%**`
                            ].join('\n'))
                            .setColor(config.COLORS.WARNING)
                            .setTimestamp()
                            .setFooter({ text: 'Iris Market • Backup System', iconURL: config.IMG });

                        await progressMessage.edit({ embeds: [updatedEmbed] });
                    }

                    // Delay ngay cả khi lỗi
                    await new Promise(resolve => setTimeout(resolve, 1000));
                }
            }

            // Embed kết quả cuối cùng
            const resultEmbed = new EmbedBuilder()
                .setTitle('✅ Backup Hoàn Tất!')
                .setDescription([
                    `📊 **Tổng số orders:** ${totalOrders}`,
                    `✅ **Thành công:** ${successCount}`,
                    `❌ **Thất bại:** ${failedCount}`,
                    `📈 **Tỷ lệ thành công:** ${Math.round((successCount / totalOrders) * 100)}%`
                ].join('\n'))
                .setColor(successCount === totalOrders ? config.COLORS.SUCCESS : config.COLORS.WARNING)
                .setTimestamp()
                .setFooter({ text: 'Iris Market • Backup System', iconURL: config.IMG });

            await progressMessage.edit({ embeds: [resultEmbed] });

        } catch (error) {
            console.error('❌ Lỗi khi backup vouches:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Lỗi Backup')
                .setDescription(`Đã xảy ra lỗi khi backup vouches:\n\`\`\`${error.message}\`\`\``)
                .setColor(config.COLORS.ERROR)
                .setTimestamp();

            await interaction.editReply({ embeds: [errorEmbed] });
        }
    }
};

