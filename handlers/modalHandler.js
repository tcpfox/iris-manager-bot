const { EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');

const DB_PATH = {
    products: path.join(__dirname, '../database/products.json')
};

module.exports = {
    async execute(interaction) {
        const customId = interaction.customId;
        
        try {
            // Xử lý modal editrequest
            if (customId.startsWith('editrequest_modal_')) {
                // Tách customId: editrequest_modal_[productId]_[type]
                const withoutPrefix = customId.replace('editrequest_modal_', '');
                const lastUnderscoreIndex = withoutPrefix.lastIndexOf('_');
                const productId = withoutPrefix.substring(0, lastUnderscoreIndex);
                const type = withoutPrefix.substring(lastUnderscoreIndex + 1);
                const content = interaction.fields.getTextInputValue('content_input');

                console.log('Modal customId:', customId);
                console.log('Parsed productId:', productId);
                console.log('Parsed type:', type);

                // Đọc dữ liệu products
                const productsData = await fs.readFile(DB_PATH.products, 'utf8');
                const products = JSON.parse(productsData);

                // Tìm sản phẩm theo ID hoặc tên
                let productIndex = products.items.findIndex(prod => prod.id === productId);
                
                // Nếu không tìm thấy theo ID, thử tìm theo tên
                if (productIndex === -1) {
                    productIndex = products.items.findIndex(prod => 
                        prod.name.toLowerCase().includes(productId.toLowerCase()) ||
                        productId.toLowerCase().includes(prod.name.toLowerCase())
                    );
                }

                if (productIndex === -1) {
                    return await interaction.reply({
                        content: `❌ Không tìm thấy sản phẩm với ID: ${productId}!`,
                        ephemeral: true
                    });
                }

                const product = products.items[productIndex];

                // Cập nhật nội dung theo type
                if (type === 'request') {
                    product.requestContent = content;
                } else if (type === 'tos') {
                    product.tosContent = content;
                }

                // Cập nhật database
                products.items[productIndex] = product;
                await fs.writeFile(DB_PATH.products, JSON.stringify(products, null, 4));

                const embed = new EmbedBuilder()
                    .setTitle('✅ Chỉnh Sửa Yêu Cầu Thành Công')
                    .setDescription([
                        `**Sản phẩm:** ${product.name}`,
                        `**Loại:** ${type === 'request' ? 'Yêu Cầu Khi Mua' : 'Term of Service'}`,
                        `**Nội dung:** ${content}`,
                        '',
                        'Nội dung đã được cập nhật và sẽ hiển thị khi khách hàng nhấn vào button tương ứng.'
                    ].join('\n'))
                    .setColor('#ffaa00')
                    .setThumbnail(product.imageUrl)
                    .setTimestamp()
                    .setFooter({ text: 'Iris Market • Quản lý sản phẩm' });

                await interaction.reply({
                    embeds: [embed],
                    ephemeral: true
                });
            }
            
            // Xử lý modal tùy theo customId
            if (customId === 'example_modal') {
                const input = interaction.fields.getTextInputValue('input_field');
                
                await interaction.reply({
                    content: `✅ Bạn đã nhập: ${input}`,
                    ephemeral: true
                });
            }
            
        } catch (error) {
            console.error('Error in modal handler:', error);
            await interaction.reply({
                content: '❌ Đã xảy ra lỗi khi xử lý biểu mẫu.',
                ephemeral: true
            });
        }
    }
};