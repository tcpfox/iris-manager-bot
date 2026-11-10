const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const config = require('../../config.json');

const DB_PATH = {
    decorations: path.join(__dirname, '../../database/decorations.json')
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('paneldeco')
        .setDescription('Tạo panel decoration'),
    
    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const success = await this.updateDecoList(interaction.client);

            if (success) {
                const embed = new EmbedBuilder()
                    .setTitle('✅ Thành công!')
                    .setDescription('Đã cập nhật bảng decoration thành công!')
                    .setColor('#00ff00')
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
            } else {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Lỗi!')
                    .setDescription('Không thể cập nhật bảng decoration. Vui lòng kiểm tra lại cấu hình.')
                    .setColor('#ff0000')
                    .setTimestamp();

                await interaction.editReply({ embeds: [errorEmbed] });
            }
        } catch (error) {
            console.error('Error in paneldeco command:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Lỗi!')
                .setDescription('Đã xảy ra lỗi khi tạo panel. Vui lòng thử lại sau.')
                .setColor('#ff0000')
                .setTimestamp();

            if (interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed] });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    },

    async updateDecoList(client) {
        try {
            const decoChannelId = config.CHANNELS.DECO_CHANNEL;
            const decoChannel = await client.channels.fetch(decoChannelId);
            if (!decoChannel) return false;

            // Clear existing messages
            const messages = await decoChannel.messages.fetch({ limit: 100 });
            await decoChannel.bulkDelete(messages);

            // Read decoration database
            const decorations = JSON.parse(await fs.readFile(DB_PATH.decorations, 'utf8'));

            // Separate decorations by Nitro status and sort by original price
            const withNitroDecorations = decorations.decorations
                .filter(deco => deco.hasNitro)
                .sort((a, b) => a.originalPrice - b.originalPrice);
            const withoutNitroDecorations = decorations.decorations
                .filter(deco => !deco.hasNitro)
                .sort((a, b) => a.originalPrice - b.originalPrice);

            // Format price lists
            const formatPriceList = (decorations) => {
                return decorations.map(deco => 
                    `${deco.originalPrice.toLocaleString('vi-VN')} VND -> ${deco.sellPrice.toLocaleString('vi-VN')} VND`
                ).join('\n');
            };

            const withNitroPrices = formatPriceList(withNitroDecorations);
            const withoutNitroPrices = formatPriceList(withoutNitroDecorations);

            // Create header embed
            const headerEmbed = new EmbedBuilder()
                .setColor('#c8f0ff')
                .setTitle('✨ Khung Trang Trí & Hiệu Ứng Hồ Sơ ✨')
                .setDescription([
                    '📌 **Bên trái:** Giá gốc tại Discord',
                    '📌 **Bên phải:** Giá bán tại Iris Market',
                    '',
                    '**Tài khoản có Nitro khi mua:**',
                    '```ini',
                    withNitroPrices || 'Chưa có decoration nào',
                    '```',
                    '',
                    '**Tài khoản không có Nitro khi mua:**',
                    '```ini',
                    withoutNitroPrices || 'Chưa có decoration nào',
                    '```'
                ].join('\n'))
                .setImage(config.GIFIMG)
                .setTimestamp()
                .setFooter({ 
                    text: 'Iris Market • Premium Decorations', 
                    iconURL: config.IMG 
                });

            // Create buttons
            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('request_buy')
                        .setLabel('Yêu cầu khi mua')
                        .setStyle(ButtonStyle.Success)
                        .setEmoji('📋'),
                    new ButtonBuilder()
                        .setCustomId('benefits_buy')
                        .setLabel('Quyền lợi khi mua')
                        .setStyle(ButtonStyle.Danger)
                        .setEmoji('🎁')
                );

            // Send and pin message
            const message = await decoChannel.send({
                embeds: [headerEmbed],
                components: [row]
            });
            await message.pin();

            return true;
        } catch (error) {
            console.error('Error updating decoration list:', error);
            return false;
        }
    }
};
