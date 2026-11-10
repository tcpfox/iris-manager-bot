const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const config = require('../../config.json');

const DB_PATH = {
    categories: path.join(__dirname, '../../database/categories.json'),
    products: path.join(__dirname, '../../database/products.json'),
    decorations: path.join(__dirname, '../../database/decorations.json')
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('panelprice')
        .setDescription('Tạo panel giá sản phẩm'),
    
    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const success = await this.updatePriceList(interaction.client);

            if (success) {
                const embed = new EmbedBuilder()
                    .setTitle('✅ Thành công!')
                    .setDescription('Đã cập nhật bảng giá sản phẩm thành công!')
                    .setColor('#00ff00')
                    .setTimestamp();

                await interaction.editReply({ embeds: [embed] });
            } else {
                const errorEmbed = new EmbedBuilder()
                    .setTitle('❌ Lỗi!')
                    .setDescription('Không thể cập nhật bảng giá. Vui lòng kiểm tra lại cấu hình.')
                    .setColor('#ff0000')
                    .setTimestamp();

                await interaction.editReply({ embeds: [errorEmbed] });
            }
        } catch (error) {
            console.error('Error in panelprice command:', error);
            
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

    async updatePriceList(client) {
        try {
            const priceChannelId = config.CHANNELS.PRICE_CHANNEL;
            const priceChannel = await client.channels.fetch(priceChannelId);
            if (!priceChannel) return false;

            // Clear existing messages
            const messages = await priceChannel.messages.fetch({ limit: 100 });
            await priceChannel.bulkDelete(messages);

            // Read databases
            const categories = JSON.parse(await fs.readFile(DB_PATH.categories, 'utf8'));
            const products = JSON.parse(await fs.readFile(DB_PATH.products, 'utf8'));

            // Create header embed
            const headerEmbed = new EmbedBuilder()
                .setColor('#c8f0ff')
                .setTitle('Iris Market <a:crown:1319714550920253543>')
                .setDescription([
                    '```ini',
                    '[🛍️ Bảng Giá Sản Phẩm & Dịch Vụ]',
                    '```',
                    '',
                    '<a:sparkles:1323988763390509077> **Hướng dẫn sử dụng:**',
                    '> Chọn danh mục hoặc sản phẩm từ menu bên dưới',
                    '> Xem thông tin chi tiết về giá và điều khoản',
                    '> Tạo ticket để được hỗ trợ mua hàng',
                    '',
                    '<a:warning:1323988763390509077> **Lưu ý quan trọng:**',
                    '```md',
                    '# Thông tin chung',
                    '* Giá có thể thay đổi theo thời gian',
                    '* Đọc kỹ điều khoản trước khi mua hàng',
                    '* Support 24/7 qua ticket system',
                    '```',
                    '',
                    '<a:gift:1323988763390509077> **Ưu đãi đặc biệt:**',
                    '> • Giảm giá cho khách hàng thân thiết',
                    '> • Bảo hành sản phẩm lâu dài',
                    '> • Hỗ trợ setup miễn phí'
                ].join('\n'))
                .setThumbnail(config.THUMB)
                .setImage(config.GIFIMG)
                .setTimestamp()
                .setFooter({ 
                    text: 'Iris Market • Premium Products & Services', 
                    iconURL: config.IMG 
                });

            // Create menu options
            const menuOptions = categories.items.map(category => ({
                label: category.name,
                value: `category_${category.name}`,
                description: category.description?.substring(0, 100),
                emoji: category.icon || '📦'
            }));

            // Create select menu
            const row = new ActionRowBuilder()
                .addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId('menu_select')
                        .setPlaceholder('🛍️ Chọn sản phẩm hoặc danh mục...')
                        .addOptions(menuOptions)
                );

            // Send and pin message
            const message = await priceChannel.send({
                embeds: [headerEmbed],
                components: [row]
            });
            await message.pin();

            return true;
        } catch (error) {
            console.error('Error updating price list:', error);
            return false;
        }
    },

};
