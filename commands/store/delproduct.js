const { EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const config = require('../../config.json');

const DB_PATH = {
    products: path.join(__dirname, '../../database/products.json')
};

module.exports = {
    name: 'delproduct',
    description: 'Xóa một sản phẩm khỏi cửa hàng',
    usage: 'delproduct <product_name>',
    aliases: ['dp', 'delp', 'removeproduct'],
    
    async execute(message, args) {
        try {
            if (args.length < 1) {
                const embed = new EmbedBuilder()
                    .setTitle('❌ Lỗi cú pháp!')
                    .setDescription([
                        '**Cách sử dụng:**',
                        '`delproduct <product_name>`',
                        '',
                        '**Tham số:**',
                        '• `product_name` - Tên của sản phẩm cần xóa',
                        '',
                        '**Ví dụ:**',
                        '`delproduct "Nitro Boost"`',
                        '`delproduct "Spotify Premium"`',
                        '',
                        '**Lưu ý:**',
                        '• Lệnh này sẽ xóa vĩnh viễn sản phẩm khỏi database',
                        '• Không thể hoàn tác sau khi xóa',
                        '• Hãy chắc chắn về tên sản phẩm trước khi thực hiện'
                    ].join('\n'))
                    .setColor('#ff0000')
                    .setTimestamp();

                return message.reply({ embeds: [embed] });
            }

            const productName = args[0];

            const loadingEmbed = new EmbedBuilder()
                .setTitle('⏳ Đang xóa sản phẩm...')
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

            // Remove the product
            products.items.splice(productIndex, 1);

            // Save changes
            await fs.writeFile(DB_PATH.products, JSON.stringify(products, null, 2));

            const embed = new EmbedBuilder()
                .setTitle('✅ Xóa sản phẩm thành công!')
                .setDescription(`Đã xóa sản phẩm **${product.name}** khỏi cửa hàng.`)
                .addFields(
                    { name: 'Tên sản phẩm', value: product.name, inline: true },
                    { name: 'ID sản phẩm', value: product.id, inline: true },
                    { name: 'Giá', value: `${product.price.toLocaleString()}₫`, inline: true },
                    { name: 'Mô tả', value: product.description },
                    { name: 'Danh mục ID', value: product.categoryId, inline: true },
                    { name: 'Ngày tạo', value: new Date(product.createdAt).toLocaleDateString('vi-VN'), inline: true }
                )
                .setColor('#ff0000')
                .setTimestamp()
                .setFooter({ text: 'Iris Market • Quản lý sản phẩm' });

            await loadingMessage.edit({ embeds: [embed] });

        } catch (error) {
            console.error('Error deleting product:', error);
            await message.reply({
                content: '❌ Đã xảy ra lỗi khi xóa sản phẩm. Vui lòng thử lại sau.'
            });
        }
    }
};
