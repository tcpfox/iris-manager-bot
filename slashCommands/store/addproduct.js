const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const config = require('../../config.json');

const DB_PATH = {
    categories: path.join(__dirname, '../../database/categories.json'),
    products: path.join(__dirname, '../../database/products.json')
};

// Tạo choices cơ bản từ categories.json
let categoryChoices = [];
try {
    const categoriesData = require('../../database/categories.json');
    if (categoriesData.items && categoriesData.items.length > 0) {
        categoryChoices = categoriesData.items.map(cat => ({
            name: cat.name,
            value: cat.name
        }));
    }
} catch (error) {
    console.error('Error loading category choices:', error);
    categoryChoices = [
        { name: 'Nitro', value: 'Nitro' },
        { name: 'Boost Server', value: 'Boost Server' },
        { name: 'Spotify', value: 'Spotify' },
        { name: 'Netflix', value: 'Netflix' },
        { name: 'Youtube', value: 'Youtube' }
    ];
}

// Tạo command builder với choices có sẵn
const commandBuilder = new SlashCommandBuilder()
    .setName('addproduct')
    .setDescription('Thêm một sản phẩm mới vào cửa hàng.')
    .addStringOption(option =>
        option.setName('category')
            .setDescription('Chọn danh mục cho sản phẩm')
            .setRequired(true)
            .addChoices(...categoryChoices))
    .addStringOption(option =>
       option.setName('proname')
            .setDescription('Tên sản phẩm')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('description')
            .setDescription('Mô tả sản phẩm')
            .setRequired(true))
    .addIntegerOption(option =>
        option.setName('price')
            .setDescription('Giá sản phẩm (VND)')
            .setRequired(true))
    .addStringOption(option =>
        option.setName('image')
            .setDescription('URL hình ảnh sản phẩm')
            .setRequired(false));

module.exports = {
    data: commandBuilder,

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const categoryName = interaction.options.getString('category');
            const productName = interaction.options.getString('proname');
            const description = interaction.options.getString('description');
            const price = interaction.options.getInteger('price');
            const imageUrl = interaction.options.getString('image') || config.GIFIMG;

            // Đọc dữ liệu categories và products
            const categoriesData = await fs.readFile(DB_PATH.categories, 'utf8');
            const categories = JSON.parse(categoriesData);
            
            const productsData = await fs.readFile(DB_PATH.products, 'utf8');
            const products = JSON.parse(productsData);

            // Tìm category
            const category = categories.items.find(cat => 
                cat.name.toLowerCase() === categoryName.toLowerCase()
            );

            if (!category) {
                return await interaction.editReply({
                    content: '❌ Không tìm thấy danh mục được chọn!',
                    ephemeral: true
                });
            }

            // Tạo product ID từ tên (loại bỏ ký tự đặc biệt)
            const productId = productName.toLowerCase()
                .replace(/[^a-z0-9\s]/g, '')
                .replace(/\s+/g, '_');

            // Kiểm tra xem product đã tồn tại chưa
            const existingProduct = products.items.find(prod => 
                prod.name.toLowerCase() === productName.toLowerCase()
            );

            if (existingProduct) {
                return await interaction.editReply({
                    content: `❌ Sản phẩm "${productName}" đã tồn tại!`,
                    ephemeral: true
                });
            }

            // Tạo sản phẩm mới
            const newProduct = {
                id: productId,
                name: productName,
                description: description,
                price: price,
                categoryId: category.id,
                imageUrl: imageUrl,
                additionalInfo: "Không có thông tin thêm",
                createdAt: new Date().toISOString(),
                createdBy: interaction.user.id
            };

            // Thêm sản phẩm vào database
            products.items.push(newProduct);
            await fs.writeFile(DB_PATH.products, JSON.stringify(products, null, 4));

            const embed = new EmbedBuilder()
                .setTitle('✅ Thêm Sản Phẩm Thành Công')
                .setDescription([
                    `**Tên sản phẩm:** ${productName}`,
                    `**Mô tả:** ${description}`,
                    `**Giá:** ${price.toLocaleString()} VND`,
                    `**Danh mục:** ${categoryName}`,
                    '',
                    'Sản phẩm đã được thêm vào cơ sở dữ liệu và sẽ xuất hiện trong danh sách sản phẩm của danh mục.'
                ].join('\n'))
                .setColor('#00ff00')
                .setThumbnail(imageUrl)
                .setTimestamp()
                .setFooter({ text: 'Iris Market • Quản lý sản phẩm' });

            await interaction.editReply({
                embeds: [embed]
            });

        } catch (error) {
            console.error('Error in addproduct command:', error);
            await interaction.editReply({
                content: '❌ Đã xảy ra lỗi khi thêm sản phẩm.',
                ephemeral: true
            });
        }
    }
};