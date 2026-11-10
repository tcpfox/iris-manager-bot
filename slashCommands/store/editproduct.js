const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const config = require('../../config.json');
const { loadProductChoices } = require('../../utils/commandHelpers');

const DB_PATH = {
    categories: path.join(__dirname, '../../database/categories.json'),
    products: path.join(__dirname, '../../database/products.json')
};

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

// Tạo command builder với choices cơ bản
const commandBuilder = new SlashCommandBuilder()
    .setName('editproduct')
    .setDescription('Chỉnh sửa thông tin sản phẩm')
    .addStringOption(option =>
        option.setName('product')
            .setDescription('Chọn sản phẩm cần chỉnh sửa')
            .setRequired(true)
            .addChoices(...productChoices))
    .addStringOption(option =>
        option.setName('field')
            .setDescription('Trường cần chỉnh sửa')
            .setRequired(true)
            .addChoices(
                { name: 'Tên sản phẩm', value: 'name' },
                { name: 'Mô tả', value: 'description' },
                { name: 'Giá', value: 'price' },
                { name: 'Danh mục', value: 'categoryName' },
                { name: 'Hình ảnh', value: 'imageUrl' },
                { name: 'Thông tin thêm', value: 'additionalInfo' }
            ))
    .addStringOption(option =>
        option.setName('value')
            .setDescription('Giá trị mới')
            .setRequired(true));

module.exports = {
    data: commandBuilder,

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const productName = interaction.options.getString('product');
            const field = interaction.options.getString('field');
            const newValue = interaction.options.getString('value');

            // Đọc dữ liệu products và categories
            const productsData = await fs.readFile(DB_PATH.products, 'utf8');
            const products = JSON.parse(productsData);
            
            const categoriesData = await fs.readFile(DB_PATH.categories, 'utf8');
            const categories = JSON.parse(categoriesData);

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

            // Xử lý từng field
            switch (field) {
                case 'name':
                    product.name = newValue;
                    // Cập nhật ID
                    product.id = newValue.toLowerCase()
                        .replace(/[^a-z0-9\s]/g, '')
                        .replace(/\s+/g, '_');
                    break;
                case 'description':
                    product.description = newValue;
                    break;
                case 'price':
                    const price = parseInt(newValue);
                    if (isNaN(price) || price < 0) {
                        return await interaction.editReply({
                            content: '❌ Giá phải là số dương hợp lệ!',
                            ephemeral: true
                        });
                    }
                    product.price = price;
                    break;
                case 'categoryName':
                    const category = categories.items.find(cat => 
                        cat.name.toLowerCase() === newValue.toLowerCase()
                    );
                    if (!category) {
                        return await interaction.editReply({
                            content: `❌ Không tìm thấy danh mục "${newValue}"!`,
                            ephemeral: true
                        });
                    }
                    product.categoryId = category.id;
                    break;
                case 'imageUrl':
                    product.imageUrl = newValue || config.GIFIMG;
                    break;
                case 'additionalInfo':
                    product.additionalInfo = newValue;
                    break;
                default:
                    return await interaction.editReply({
                        content: '❌ Trường không hợp lệ!',
                        ephemeral: true
                    });
            }

            // Cập nhật database
            products.items[productIndex] = product;
            await fs.writeFile(DB_PATH.products, JSON.stringify(products, null, 4));

            const embed = new EmbedBuilder()
                .setTitle('✅ Chỉnh Sửa Sản Phẩm Thành Công')
                .setDescription([
                    `**Sản phẩm:** ${product.name}`,
                    `**Trường đã chỉnh sửa:** ${field}`,
                    `**Giá trị mới:** ${newValue}`,
                    '',
                    'Sản phẩm đã được cập nhật trong cơ sở dữ liệu.'
                ].join('\n'))
                .setColor('#ffaa00')
                .setThumbnail(product.imageUrl)
                .setTimestamp()
                .setFooter({ text: 'Iris Market • Quản lý sản phẩm' });

            await interaction.editReply({
                embeds: [embed]
            });

        } catch (error) {
            console.error('Error in editproduct command:', error);
            await interaction.editReply({
                content: '❌ Đã xảy ra lỗi khi chỉnh sửa sản phẩm.',
                ephemeral: true
            });
        }
    }
};