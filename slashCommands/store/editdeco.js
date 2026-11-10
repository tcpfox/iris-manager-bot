const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

const DB_PATH = path.join(__dirname, '../../database/decorations.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('editdeco')
        .setDescription('Chỉnh sửa decoration')
        .addIntegerOption(option =>
            option.setName('id')
                .setDescription('ID của decoration cần chỉnh sửa')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('originalprice')
                .setDescription('Giá gốc mới tại Discord (VND)')
                .setRequired(false))
        .addIntegerOption(option =>
            option.setName('sellprice')
                .setDescription('Giá bán mới tại Urban Store (VND)')
                .setRequired(false))
        .addBooleanOption(option =>
            option.setName('hasnitro')
                .setDescription('Loại tài khoản mới (có Nitro hay không)')
                .setRequired(false)),
    
    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const decorationId = interaction.options.getInteger('id');
            const newOriginalPrice = interaction.options.getInteger('originalprice');
            const newSellPrice = interaction.options.getInteger('sellprice');
            const newHasNitro = interaction.options.getBoolean('hasnitro');

            // Read current data
            const data = JSON.parse(await fs.readFile(DB_PATH, 'utf8'));
            
            // Find decoration to edit
            const decoration = data.decorations.find(item => item.id === decorationId);
            
            if (!decoration) {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Lỗi!')
                    .setDescription(`Không tìm thấy decoration với ID: ${decorationId}`)
                    .setColor('#ff0000');
                
                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            // Check if at least one field is provided
            if (newOriginalPrice === null && newSellPrice === null && newHasNitro === null) {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Lỗi!')
                    .setDescription('Vui lòng cung cấp ít nhất một trường để chỉnh sửa')
                    .setColor('#ff0000');
                
                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            // Store old values for display
            const oldValues = {
                originalPrice: decoration.originalPrice,
                sellPrice: decoration.sellPrice,
                hasNitro: decoration.hasNitro
            };

            // Update fields if provided
            if (newOriginalPrice !== null) decoration.originalPrice = newOriginalPrice;
            if (newSellPrice !== null) decoration.sellPrice = newSellPrice;
            if (newHasNitro !== null) decoration.hasNitro = newHasNitro;

            // Validate prices
            if (decoration.originalPrice <= 0 || decoration.sellPrice <= 0) {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Lỗi!')
                    .setDescription('Giá phải lớn hơn 0 VND')
                    .setColor('#ff0000');
                
                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            if (decoration.sellPrice >= decoration.originalPrice) {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Lỗi!')
                    .setDescription('Giá bán phải nhỏ hơn giá gốc')
                    .setColor('#ff0000');
                
                return await interaction.editReply({ embeds: [errorEmbed] });
            }

            // Save data
            await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));

            const successEmbed = new EmbedBuilder()
                .setTitle('✅ Thành công!')
                .setDescription(`Đã chỉnh sửa decoration ID ${decorationId}:\n\n` +
                    `💰 **Giá gốc:** ${oldValues.originalPrice.toLocaleString('vi-VN')} VND → ${decoration.originalPrice.toLocaleString('vi-VN')} VND\n` +
                    `💵 **Giá bán:** ${oldValues.sellPrice.toLocaleString('vi-VN')} VND → ${decoration.sellPrice.toLocaleString('vi-VN')} VND\n` +
                    `🎯 **Loại tài khoản:** ${oldValues.hasNitro ? 'Có Nitro' : 'Không có Nitro'} → ${decoration.hasNitro ? 'Có Nitro' : 'Không có Nitro'}`)
                .setColor('#00ff00')
                .setTimestamp();

            await interaction.editReply({ embeds: [successEmbed] });

        } catch (error) {
            console.error('Error in editdeco command:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Lỗi!')
                .setDescription('Đã xảy ra lỗi khi chỉnh sửa decoration. Vui lòng thử lại sau.')
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

