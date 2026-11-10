const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { isOwner } = require('../../utils/helpers');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('nuke')
        .setDescription('💣 Hủy diệt kênh hiện tại (Owner only)'),
    
    async execute(interaction) {
        try {
            // Kiểm tra quyền: chỉ owner
            if (!isOwner(interaction.user.id)) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(config.COLORS.ERROR)
                            .setTitle('❌ Không có quyền')
                            .setDescription('Chỉ owner mới có thể sử dụng lệnh này!')
                            .setTimestamp()
                            .setFooter({ 
                                text: 'Iris Market', 
                                iconURL: config.IMG 
                            })
                    ],
                    ephemeral: true
                });
            }

            const channel = interaction.channel;

            // Tạo embed xác nhận với buttons
            const confirmEmbed = new EmbedBuilder()
                .setColor(config.COLORS.WARNING)
                .setTitle('💣 Xác nhận Nuke Channel')
                .setDescription(`Bạn có chắc chắn muốn **HỦY DIỆT** kênh <#${channel.id}>?\n\n⚠️ **Cảnh báo:** Hành động này sẽ:\n• Xóa tất cả tin nhắn trong kênh\n• Tạo lại kênh với cấu hình giống hệt\n• Không thể hoàn tác!`)
                .addFields({
                    name: '📋 Thông tin kênh',
                    value: `**Tên:** ${channel.name}\n**ID:** ${channel.id}`,
                    inline: false
                })
                .setTimestamp()
                .setFooter({ 
                    text: `Yêu cầu bởi ${interaction.user.tag}`, 
                    iconURL: config.IMG 
                });

            // Tạo buttons
            const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('nuke_confirm')
                        .setLabel('Xác nhận Nuke')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('💣'),
                    new ButtonBuilder()
                        .setCustomId('nuke_cancel')
                        .setLabel('Hủy bỏ')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('❌')
                );

            const reply = await interaction.reply({ 
                embeds: [confirmEmbed], 
                components: [row],
                fetchReply: true
            });

            // Tạo collector cho button interactions
            const filter = (i) => {
                return (i.customId === 'nuke_confirm' || i.customId === 'nuke_cancel') && 
                       i.user.id === interaction.user.id;
            };

            const collector = reply.createMessageComponentCollector({ 
                filter, 
                time: 30000 // 30 giây
            });

            collector.on('collect', async (i) => {
                if (i.customId === 'nuke_confirm') {
                    await i.deferUpdate();

                    // Embed đang thực hiện
                    const processingEmbed = new EmbedBuilder()
                        .setColor(config.COLORS.WARNING)
                        .setTitle('💣 Đang thực hiện nuke...')
                        .setDescription('Vui lòng đợi trong giây lát...')
                        .setTimestamp()
                        .setFooter({ 
                            text: 'Iris Market', 
                            iconURL: config.IMG 
                        });

                    const processingMessage = await channel.send({ embeds: [processingEmbed] });

                    try {
                        // Lưu thông tin kênh
                        const position = channel.position;
                        const channelData = {
                            name: channel.name,
                            topic: channel.topic,
                            nsfw: channel.nsfw,
                            rateLimitPerUser: channel.rateLimitPerUser,
                            parent: channel.parentId,
                            permissionOverwrites: channel.permissionOverwrites.cache.map(overwrite => ({
                                id: overwrite.id,
                                type: overwrite.type,
                                allow: overwrite.allow.toArray(),
                                deny: overwrite.deny.toArray()
                            }))
                        };

                        // Clone kênh
                        const newChannel = await channel.clone();
                        
                        // Xóa kênh cũ
                        await channel.delete();

                        // Khôi phục cấu hình
                        await newChannel.edit(channelData);
                        await newChannel.setPosition(position);

                        // Gửi thông báo thành công
                        const successEmbed = new EmbedBuilder()
                            .setColor(config.COLORS.SUCCESS)
                            .setTitle('✅ Nuke thành công!')
                            .setDescription(`Kênh đã được nuke bởi ||${interaction.user.tag}||`)
                            .setTimestamp()
                            .setFooter({ 
                                text: 'Iris Market', 
                                iconURL: config.IMG 
                            });

                        await newChannel.send({ embeds: [successEmbed] });

                    } catch (error) {
                        console.error('Error nuking channel:', error);
                        
                        const errorEmbed = new EmbedBuilder()
                            .setColor(config.COLORS.ERROR)
                            .setTitle('❌ Lỗi')
                            .setDescription('Đã xảy ra lỗi khi thực hiện nuke!')
                            .setTimestamp()
                            .setFooter({ 
                                text: 'Iris Market', 
                                iconURL: config.IMG 
                            });
                        
                        await processingMessage.edit({ embeds: [errorEmbed] });
                    }

                    collector.stop();
                } else if (i.customId === 'nuke_cancel') {
                    await i.deferUpdate();

                    const cancelEmbed = new EmbedBuilder()
                        .setColor(config.COLORS.INFO)
                        .setTitle('❌ Đã hủy')
                        .setDescription('Hành động nuke đã được hủy bỏ.')
                        .setTimestamp()
                        .setFooter({ 
                            text: 'Iris Market', 
                            iconURL: config.IMG 
                        });
                    
                    await interaction.editReply({ 
                        embeds: [cancelEmbed], 
                        components: [] 
                    });

                    collector.stop();
                }
            });

            collector.on('end', async (collected) => {
                if (collected.size === 0) {
                    // Hết thời gian, không có phản hồi
                    const timeoutEmbed = new EmbedBuilder()
                        .setColor(config.COLORS.WARNING)
                        .setTitle('⏰ Hết thời gian')
                        .setDescription('Đã hết thời gian xác nhận. Hành động nuke đã được hủy bỏ.')
                        .setTimestamp()
                        .setFooter({ 
                            text: 'Iris Market', 
                            iconURL: config.IMG 
                        });
                    
                    try {
                        await interaction.editReply({ 
                            embeds: [timeoutEmbed], 
                            components: [] 
                        });
                    } catch (error) {
                        // Interaction đã hết hạn hoặc đã được xử lý
                    }
                }
            });

        } catch (error) {
            console.error('Error in nuke command:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor(config.COLORS.ERROR)
                .setTitle('❌ Lỗi')
                .setDescription('Đã xảy ra lỗi khi thực hiện lệnh nuke!')
                .setTimestamp()
                .setFooter({ 
                    text: 'Iris Market', 
                    iconURL: config.IMG 
                });
            
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed] });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    },
};

