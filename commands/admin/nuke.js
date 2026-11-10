const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { isOwner } = require('../../utils/helpers');
const config = require('../../config.json');

module.exports = {
    name: 'nuke',
    description: '💣 Hủy diệt kênh hiện tại',
    usage: 'nuke',
    aliases: ['destroy', 'reset'],
    
    async execute(message, args) {
        try {
            // Kiểm tra quyền: chỉ owner
            if (!isOwner(message.author.id)) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(config.COLORS.ERROR)
                    .setTitle('❌ Không có quyền')
                    .setDescription('Chỉ owner mới có thể sử dụng lệnh này!')
                    .setTimestamp()
                    .setFooter({ 
                        text: 'Iris Market', 
                        iconURL: config.IMG 
                    });
                
                return message.reply({ embeds: [errorEmbed] });
            }

            const channel = message.channel;

            // Tạo embed xác nhận
            const confirmEmbed = new EmbedBuilder()
                .setColor(config.COLORS.WARNING)
                .setTitle('💣 Xác nhận Nuke Channel')
                .setDescription(`Bạn có chắc chắn muốn **Nuke** kênh <#${channel.id}>?\n\n⚠️ **Cảnh báo:** Hành động này sẽ:\n• Xóa tất cả tin nhắn trong kênh\n• Tạo lại kênh với cấu hình giống hệt\n• Không thể hoàn tác!`)
                .addFields({
                    name: '📋 Thông tin kênh',
                    value: `**Tên:** ${channel.name}\n**ID:** ${channel.id}`,
                    inline: false
                })
                .setTimestamp()
                .setFooter({ 
                    text: `Yêu cầu bởi ${message.author.tag}`, 
                    iconURL: config.IMG 
                });

            // Tạo buttons
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

            const confirmMessage = await message.reply({ 
                embeds: [confirmEmbed], 
                components: [row] 
            });

            // Tạo collector để lắng nghe button interactions
            const filter = (i) => {
                return (i.customId === 'nuke_confirm' || i.customId === 'nuke_cancel') && 
                       i.user.id === message.author.id;
            };

            const collector = confirmMessage.createMessageComponentCollector({ 
                filter, 
                time: 30000 // 30 giây
            });

            collector.on('collect', async (i) => {
                if (i.customId === 'nuke_confirm') {
                    // Xác nhận nuke
                    await i.deferUpdate();
                    await confirmMessage.delete().catch(() => {});

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
                            .setDescription(`Kênh đã được nuke bởi ||${message.author.tag}||`)
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
                    // Hủy bỏ
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
                    
                    await confirmMessage.edit({ 
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
                        await confirmMessage.edit({ 
                            embeds: [timeoutEmbed], 
                            components: [] 
                        });
                    } catch (error) {
                        // Message có thể đã bị xóa hoặc không thể chỉnh sửa
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
            
            await message.reply({ embeds: [errorEmbed] });
        }
    },
};

