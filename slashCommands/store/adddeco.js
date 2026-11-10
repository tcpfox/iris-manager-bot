const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

const DB_PATH = path.join(__dirname, '../../database/decorations.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('adddeco')
        .setDescription('Thêm decoration mới')
        .addIntegerOption(option =>
            option.setName('originalprice')
                .setDescription('Giá gốc tại Discord (VND)')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('sellprice')
                .setDescription('Giá bán tại Urban Store (VND)')
                .setRequired(true))
        .addBooleanOption(option =>
            option.setName('hasnitro')
                .setDescription('Tài khoản có Nitro khi mua')
                .setRequired(true)),
    
    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const originalPrice = interaction.options.getInteger('originalprice');
            const sellPrice = interaction.options.getInteger('sellprice');
            const hasNitro = interaction.options.getBoolean('hasnitro');

            // Validate prices
            if (originalPrice <= 0 || sellPrice <= 0) {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Lỗi!')
                    .setDescription('Giá phải lớn hơn 0 VND')
                    .setColor('#ff0000');
                
                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            if (sellPrice >= originalPrice) {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Lỗi!')
                    .setDescription('Giá bán phải nhỏ hơn giá gốc')
                    .setColor('#ff0000');
                
                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            // Read current data
            const data = JSON.parse(await fs.readFile(DB_PATH, 'utf8'));
            
            // Generate new ID
            const newId = data.decorations.length > 0 
                ? Math.max(...data.decorations.map(item => item.id)) + 1 
                : 1;

            // Add new decoration
            const newDecoration = {
                id: newId,
                originalPrice: originalPrice,
                sellPrice: sellPrice,
                hasNitro: hasNitro
            };

            data.decorations.push(newDecoration);

            // Save data
            await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));

            const successEmbed = new EmbedBuilder()
                .setTitle('✅ Thành công!')
                .setDescription(`Đã thêm decoration mới:\n\n` +
                    `🆔 **ID:** ${newId}\n` +
                    `💰 **Giá gốc:** ${originalPrice.toLocaleString('vi-VN')} VND\n` +
                    `💵 **Giá bán:** ${sellPrice.toLocaleString('vi-VN')} VND\n` +
                    `🎯 **Loại tài khoản:** ${hasNitro ? 'Có Nitro' : 'Không có Nitro'}`)
                .setColor('#00ff00')
                .setTimestamp();

            await interaction.editReply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Error in adddeco command:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Lỗi!')
                .setDescription('Đã xảy ra lỗi khi thêm decoration. Vui lòng thử lại sau.')
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

