const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const config = require('../../config.json');
const { loadProductChoices } = require('../../utils/commandHelpers');

const DB_PATH = {
    products: path.join(__dirname, '../../database/products.json')
};

// Tạo command builder với choices cơ bản
const commandBuilder = new SlashCommandBuilder()
    .setName('delproduct')
    .setDescription('Xóa sản phẩm khỏi cửa hàng')
    .addStringOption(option =>
        option.setName('product')
            .setDescription('Chọn sản phẩm cần xóa')
            .setRequired(true));

// Function để cập nhật choices sau khi bot đã khởi động
async function updateProductChoices(command) {
    try {
        const productChoices = await loadProductChoices();
        if (productChoices.length > 0) {
            const productOption = command.options.find(opt => opt.name === 'product');
            if (productOption && (!productOption.choices || productOption.choices.length === 0)) {
                productOption.addChoices(...productChoices);
            }
        }
    } catch (error) {
        console.error('Error updating delproduct choices:', error);
    }
}

module.exports = {
    data: commandBuilder,
    updateChoices: updateProductChoices,

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const productName = interaction.options.getString('product');

            // Đọc dữ liệu products
            const productsData = await fs.readFile(DB_PATH.products, 'utf8');
            const products = JSON.parse(productsData);

            // Tìm sản phẩm
            const productIndex = products.items.findIndex(prod => 
                prod.name.toLowerCase() === productName.toLowerCase()
            );

            if (productIndex === -1) {
                return await interaction.editReply({
                    content: `❌ Không tìm thấy sản phẩm "${productName}"!`,
                    ephemeral: true
                });
            }

            const product = products.items[productIndex];

            // Xóa sản phẩm
            products.items.splice(productIndex, 1);
            await fs.writeFile(DB_PATH.products, JSON.stringify(products, null, 4));

            const embed = new EmbedBuilder()
                .setTitle('🗑️ Xóa Sản Phẩm Thành Công')
                .setDescription([
                    `**Sản phẩm đã xóa:** ${product.name}`,
                    `**Mô tả:** ${product.description}`,
                    `**Giá:** ${product.price.toLocaleString()} VND`,
                    '',
                    'Sản phẩm đã được xóa khỏi cơ sở dữ liệu.'
                ].join('\n'))
                .setColor('#ff0000')
                .setThumbnail(product.imageUrl)
                .setTimestamp()
                .setFooter({ text: 'Iris Market • Quản lý sản phẩm' });

            await interaction.editReply({
                embeds: [embed]
            });

        } catch (error) {
            console.error('Error in delproduct command:', error);
            await interaction.editReply({
                content: '❌ Đã xảy ra lỗi khi xóa sản phẩm.',
                ephemeral: true
            });
        }
    }
};