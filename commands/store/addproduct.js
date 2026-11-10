const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const config = require('../../config.json');

const DB_PATH = {
    categories: path.join(__dirname, '../../database/categories.json'),
    products: path.join(__dirname, '../../database/products.json')
};

module.exports = {
    name: 'addproduct',
    description: 'Thêm một sản phẩm mới vào cửa hàng',
    usage: 'addproduct',
    aliases: ['ap', 'addp'],
    
    async execute(message, args) {
        try {
            const loadingEmbed = new EmbedBuilder()
                .setTitle('⏳ Đang tải danh sách...')
                .setDescription('Vui lòng đợi...')
                .setColor('#ffff00')
                .setTimestamp();

            const loadingMessage = await message.reply({ embeds: [loadingEmbed] });

            // Read categories data
            const categoriesData = await fs.readFile(DB_PATH.categories, 'utf8');
            const categories = JSON.parse(categoriesData);

            if (categories.items.length === 0) {
                return await loadingMessage.edit({
                    content: '❌ Không có danh mục nào để chọn!'
                });
            }

            // Create buttons for categories (max 5 per row)
            const categoryButtons = categories.items.map(category => 
                new ButtonBuilder()
                    .setCustomId(`category_${category.name}`)
                    .setLabel(category.name)
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji(category.icon || '📦')
            );

            // Split into rows of 5 buttons each
            const rows = [];
            for (let i = 0; i < categoryButtons.length; i += 5) {
                const rowButtons = categoryButtons.slice(i, i + 5);
                const row = new ActionRowBuilder().addComponents(rowButtons);
                rows.push(row);
            }

            const embed = new EmbedBuilder()
                .setTitle('📦 Thêm Sản Phẩm')
                .setDescription([
                    '**Hướng dẫn:**',
                    '1. Chọn danh mục sản phẩm từ menu bên dưới',
                    '2. Nhập thông tin sản phẩm mới',
                    '3. Sản phẩm sẽ được thêm vào danh mục đã chọn',
                    '',
                    '**Lưu ý:**',
                    '• Chọn đúng danh mục để sản phẩm được phân loại chính xác',
                    '• Có thể thêm nhiều sản phẩm vào cùng một danh mục'
                ].join('\n'))
                .setColor('#00ff00')
                .setTimestamp()
                .setFooter({ text: 'Iris Market • Quản lý sản phẩm' });

            await loadingMessage.edit({
                embeds: [embed],
                components: rows
            });

        } catch (error) {
            console.error('Error in addproduct command:', error);
            await message.reply({
                content: '❌ Đã xảy ra lỗi khi tải danh sách danh mục.'
            });
        }
    }
};