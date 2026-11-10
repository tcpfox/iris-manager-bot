const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const config = require('../../config.json');

const DB_PATH = {
    decorations: path.join(__dirname, '../../database/decorations.json')
};

module.exports = {
    name: 'paneldeco',
    description: 'Tạo panel decoration',
    usage: 'paneldeco',
    aliases: ['pd', 'deco'],
    
    async execute(message, args) {
        try {
            const loadingEmbed = new EmbedBuilder()
                .setTitle('⏳ Đang xử lý...')
                .setDescription('Đang tạo bảng decoration, vui lòng đợi...')
                .setColor('#ffff00')
                .setTimestamp();

            const loadingMessage = await message.reply({ embeds: [loadingEmbed] });

            const success = await this.updateDecoList(message.client);

            if (success) {
                const embed = new EmbedBuilder()
                    .setTitle('✅ Thành công!')
                    .setDescription('Đã cập nhật bảng decoration thành công!')
                    .setColor('#00ff00')
                    .setTimestamp();

                await loadingMessage.edit({ embeds: [embed] });
            } else {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Lỗi!')
                    .setDescription('Không thể cập nhật bảng decoration. Vui lòng kiểm tra lại cấu hình.')
                    .setColor('#ff0000')
                    .setTimestamp();

                await loadingMessage.edit({ embeds: [errorEmbed] });
            }
        } catch (error) {
            console.error('Error in paneldeco command:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Lỗi!')
                .setDescription('Đã xảy ra lỗi khi tạo panel. Vui lòng thử lại sau.')
                .setColor('#ff0000')
                .setTimestamp();

            await message.reply({ embeds: [errorEmbed] });
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

            // Create header embed
            const headerEmbed = new EmbedBuilder()
                .setColor('#c8f0ff')
                .setTitle('✨ Khung Trang Trí & Hiệu Ứng Hồ Sơ ✨')
                .setDescription([
                    '📌 **Bên trái:** Giá gốc tại Discord',
                    '📌 **Bên phải:** Giá bán tại Urban Store',
                    '',
                    '<:nitro:1331479864099995670> **Tài khoản có Nitro khi mua:**',
                    '```ini',
                    '66.000 VND -> 25.000 VND',
                    '79.000 VND -> 38.000 VND',
                    '105.000 VND -> 55.000 VND',
                    '111.000 VND -> 65.000 VND',
                    '131.000 VND -> 80.000 VND',
                    '141.000 VND -> 90.000 VND',
                    '```',
                    '',
                    '👤 **Tài khoản không có Nitro khi mua:**',
                    '```ini',
                    '79.000 VND -> 35.000 VND',
                    '131.000 VND -> 95.000 VND',
                    '141.000 VND -> 105.000 VND',
                    '146.000 VND -> 110.000 VND',
                    '189.000 VND -> 140.000 VND',
                    '```'
                ].join('\n'))
                .setImage(config.GIFIMG)
                .setTimestamp()
                .setFooter({ 
                    text: 'Urban Store • Premium Decorations', 
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
