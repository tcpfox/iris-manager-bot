const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

const DB_PATH = path.join(__dirname, '../../database/decorations.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('listdeco')
        .setDescription('Xem danh sách decorations hiện có'),
    
    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            // Read current data
            const data = JSON.parse(await fs.readFile(DB_PATH, 'utf8'));
            
            if (data.decorations.length === 0) {
                const emptyEmbed = new EmbedBuilder()
                    .setTitle('📋 Danh sách Decorations')
                    .setDescription('Chưa có decoration nào trong hệ thống.')
                    .setColor('#ffa500');
                
                return await interaction.editReply({ embeds: [emptyEmbed] });
            }

            // Separate decorations by Nitro status and sort by original price
            const withNitroDecorations = data.decorations
                .filter(deco => deco.hasNitro)
                .sort((a, b) => a.originalPrice - b.originalPrice);
            const withoutNitroDecorations = data.decorations
                .filter(deco => !deco.hasNitro)
                .sort((a, b) => a.originalPrice - b.originalPrice);

            // Format decoration list
            const formatDecorationList = (decorations, title) => {
                if (decorations.length === 0) return `**${title}:**\nChưa có decoration nào\n`;
                
                const list = decorations.map(deco => 
                    `🆔 **${deco.id}** | 💰 ${deco.originalPrice.toLocaleString('vi-VN')} VND → 💵 ${deco.sellPrice.toLocaleString('vi-VN')} VND`
                ).join('\n');
                
                return `**${title}:**\n${list}\n`;
            };

            const withNitroList = formatDecorationList(withNitroDecorations, '🎯 Tài khoản có Nitro');
            const withoutNitroList = formatDecorationList(withoutNitroDecorations, '👤 Tài khoản không có Nitro');

            const listEmbed = new EmbedBuilder()
                .setTitle('📋 Danh sách Decorations')
                .setDescription([
                    withNitroList,
                    withoutNitroList,
                    `**📊 Tổng số decorations:** ${data.decorations.length}`
                ].join('\n'))
                .setColor('#00bfff')
                .setTimestamp()
                .setFooter({ text: 'Urban Store • Decoration Management' });

            await interaction.editReply({ embeds: [listEmbed] });

        } catch (error) {
            console.error('Error in listdeco command:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Lỗi!')
                .setDescription('Đã xảy ra lỗi khi tải danh sách decorations. Vui lòng thử lại sau.')
                .setColor('#ff0000')
                .setTimestamp();

            if (interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed] });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    }
};
