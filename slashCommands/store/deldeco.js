const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

const DB_PATH = path.join(__dirname, '../../database/decorations.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('deldeco')
        .setDescription('Xóa decoration')
        .addIntegerOption(option =>
            option.setName('id')
                .setDescription('ID của decoration cần xóa')
                .setRequired(true)),
    
    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const decorationId = interaction.options.getInteger('id');

            // Read current data
            const data = JSON.parse(await fs.readFile(DB_PATH, 'utf8'));
            
            // Find decoration to delete
            const decorationIndex = data.decorations.findIndex(item => item.id === decorationId);
            
            if (decorationIndex === -1) {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Lỗi!')
                    .setDescription(`Không tìm thấy decoration với ID: ${decorationId}`)
                    .setColor('#ff0000');
                
                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            // Get decoration info before deleting
            const deletedDecoration = data.decorations[decorationIndex];
            
            // Remove decoration
            data.decorations.splice(decorationIndex, 1);

            // Save data
            await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));

            const successEmbed = new EmbedBuilder()
                .setTitle('✅ Thành công!')
                .setDescription(`Đã xóa decoration:\n\n` +
                    `🆔 **ID:** ${deletedDecoration.id}\n` +
                    `💰 **Giá gốc:** ${deletedDecoration.originalPrice.toLocaleString('vi-VN')} VND\n` +
                    `💵 **Giá bán:** ${deletedDecoration.sellPrice.toLocaleString('vi-VN')} VND\n` +
                    `🎯 **Loại tài khoản:** ${deletedDecoration.hasNitro ? 'Có Nitro' : 'Không có Nitro'}`)
                .setColor('#00ff00')
                .setTimestamp();

            await interaction.editReply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Error in deldeco command:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Lỗi!')
                .setDescription('Đã xảy ra lỗi khi xóa decoration. Vui lòng thử lại sau.')
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

