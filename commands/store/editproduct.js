const { EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const config = require('../../config.json');

const DB_PATH = {
    categories: path.join(__dirname, '../../database/categories.json'),
    products: path.join(__dirname, '../../database/products.json')
};

module.exports = {
    name: 'editproduct',
    description: 'Chỉnh sửa thông tin một sản phẩm',
    usage: 'editproduct <product_name> <field> <new_value>',
    aliases: ['ep', 'editp'],
    
    async execute(message, args) {
        try {
            if (args.length < 3) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Lỗi cú pháp!')
                    .setDescription([
                        '**Cách sử dụng:**',
                        '`editproduct <product_name> <field> <new_value>`',
                        '',
                        '**Tham số:**',
                        '• `product_name` - Tên của sản phẩm',
                        '• `field` - Trường cần chỉnh sửa',
                        '• `new_value` - Giá trị mới',
                        '',
                        '**Các trường có thể chỉnh sửa:**',
                        '• `name` - Tên sản phẩm',
                        '• `description` - Mô tả',
                        '• `price` - Giá (số)',
                        '• `categoryName` - Tên danh mục',
                        '• `imageUrl` - URL hình ảnh',
                        '• `additionalInfo` - Thông tin bổ sung',
                        '',
                        '**Ví dụ:**',
                        '`editproduct "Nitro Boost" name "Nitro Boost Premium"`',
                        '`editproduct "Nitro Boost" price 95000`',
                        '`editproduct "Nitro Boost" categoryName "Spotify"`',
                    ].join('\n'))
                    .setColor('#ff0000')
                    .setTimestamp();

                return message.reply({ embeds: [embed] });
            }

            const productName = args[0];
            const field = args[1];
            const newValue = args.slice(2).join(' ');

            const validFields = ['name', 'description', 'price', 'categoryName', 'imageUrl', 'additionalInfo'];
            if (!validFields.includes(field)) {
                return message.reply('❌ Trường không hợp lệ! Các trường hợp lệ: ' + validFields.join(', '));
            }

            const loadingEmbed = new EmbedBuilder()
                .setTitle('⏳ Đang chỉnh sửa sản phẩm...')
                .setDescription('Vui lòng đợi...')
                .setColor('#ffff00')
                .setTimestamp();

            const loadingMessage = await message.reply({ embeds: [loadingEmbed] });

            const productsData = await fs.readFile(DB_PATH.products, 'utf8');
            const products = JSON.parse(productsData);

            // Find the product by name
            const productIndex = products.items.findIndex(product => 
                product.name.toLowerCase() === productName.toLowerCase()
            );
            if (productIndex === -1) {
                return await loadingMessage.edit({
                    content: '❌ Không tìm thấy sản phẩm với tên này!'
                });
            }

            const product = products.items[productIndex];
            const oldValue = product[field];

            // Validate field-specific data
            if (field === 'price') {
                const price = parseInt(newValue);
                if (isNaN(price) || price <= 0) {
                    return await loadingMessage.edit({
                        content: '❌ Giá sản phẩm phải là số dương!'
                    });
                }
                product[field] = price;
            } else if (field === 'categoryName') {
                // Check if category exists
                const categoriesData = await fs.readFile(DB_PATH.categories, 'utf8');
                const categories = JSON.parse(categoriesData);
                const category = categories.items.find(cat => 
                    cat.name.toLowerCase() === newValue.toLowerCase()
                );
                if (!category) {
                    return await loadingMessage.edit({
                        content: '❌ Không tìm thấy danh mục với tên này!'
                    });
                }
                product.categoryId = category.id;
            } else {
                product[field] = newValue;
            }

            // Update timestamp
            product.updatedAt = new Date().toISOString();
            product.updatedBy = message.author.id;

            // Save changes
            await fs.writeFile(DB_PATH.products, JSON.stringify(products, null, 2));

            const embed = new EmbedBuilder()
                .setTitle('✅ Chỉnh sửa sản phẩm thành công!')
                .setDescription(`Đã cập nhật **${field}** của sản phẩm **${product.name}**.`)
                .addFields(
                    { name: 'Tên sản phẩm', value: product.name, inline: true },
                    { name: 'Trường', value: field, inline: true },
                    { name: 'Giá trị cũ', value: oldValue?.toString() || 'Không có', inline: true },
                    { name: 'Giá trị mới', value: newValue, inline: true },
                    { name: 'ID sản phẩm', value: product.id, inline: true },
                    { name: 'Giá', value: `${product.price.toLocaleString()}₫`, inline: true }
                )
                .setColor('#00ff00')
                .setTimestamp()
                .setFooter({ text: 'Iris Market • Quản lý sản phẩm' });

            await loadingMessage.edit({ embeds: [embed] });

        } catch (error) {
            console.error('Error editing product:', error);
            await message.reply({
                content: '❌ Đã xảy ra lỗi khi chỉnh sửa sản phẩm. Vui lòng thử lại sau.'
            });
        }
    }
};
