const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const config = require('../../config.json');

const DB_PATH = {
    products: path.join(__dirname, '../../database/products.json'),
    categories: path.join(__dirname, '../../database/categories.json')
};

// Tạo choices cơ bản từ categories.json
let categoryChoices = [];
try {
    const categoriesData = require('../../database/categories.json');
    if (categoriesData.items && categoriesData.items.length > 0) {
        categoryChoices = categoriesData.items.map(cat => ({
            name: cat.name,
            value: cat.id
        }));
    }
} catch (error) {
    console.error('Error loading category choices:', error);
    categoryChoices = [];
}

// Tạo choices cơ bản từ products.json
let productChoices = [];
try {
    const productsData = require('../../database/products.json');
    if (productsData.items && productsData.items.length > 0) {
        productChoices = productsData.items.map(prod => ({
            name: prod.name,
            value: prod.name
        }));
    }
} catch (error) {
    console.error('Error loading product choices:', error);
    productChoices = [];
}

// Tạo command builder với choices có sẵn
const commandBuilder = new SlashCommandBuilder()
    .setName('editrequest')
    .setDescription('Chỉnh sửa yêu cầu mua hàng cho sản phẩm')
    .addStringOption(option =>
        option.setName('product')
            .setDescription('Chọn sản phẩm cần chỉnh sửa')
            .setRequired(true)
            .addChoices(...productChoices))
    .addStringOption(option =>
        option.setName('type')
            .setDescription('Loại nội dung cần chỉnh sửa')
            .setRequired(true)
            .addChoices(
                { name: 'Yêu Cầu Khi Mua', value: 'request' },
                { name: 'Term of Service', value: 'tos' }
            ));

module.exports = {
    data: commandBuilder,


    async execute(interaction) {
        try {
            const productName = interaction.options.getString('product');
            const type = interaction.options.getString('type');

            // Đọc dữ liệu products
            const productsData = await fs.readFile(DB_PATH.products, 'utf8');
            const products = JSON.parse(productsData);

            // Tìm sản phẩm
            const product = products.items.find(prod => 
                prod.name.toLowerCase() === productName.toLowerCase()
            );

            if (!product) {
                return await interaction.reply({
                    content: `❌ Không tìm thấy sản phẩm "${productName}"!`,
                    ephemeral: true
                });
            }

            // Tạo modal form
            const modal = new ModalBuilder()
                .setCustomId(`editrequest_modal_${product.id}_${type}`)
                .setTitle('Chỉnh sửa nội dung');

            const contentInput = new TextInputBuilder()
                .setCustomId('content_input')
                .setLabel('Nhập thông tin')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Nhập nội dung mới...')
                .setValue(type === 'request' ? (product.requestContent || '') : (product.tosContent || ''))
                .setMaxLength(2000)
                .setRequired(true);

            const actionRow = new ActionRowBuilder().addComponents(contentInput);
            modal.addComponents(actionRow);

            await interaction.showModal(modal);

        } catch (error) {
            console.error('Error in editrequest command:', error);
            await interaction.reply({
                content: '❌ Đã xảy ra lỗi khi mở biểu mẫu.',
                ephemeral: true
            });
        }
    }
};
