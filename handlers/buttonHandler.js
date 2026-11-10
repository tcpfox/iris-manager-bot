const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const config = require('../config.json');

const DB_PATH = {
    products: path.join(__dirname, '../database/products.json'),
    categories: path.join(__dirname, '../database/categories.json'),
    decorations: path.join(__dirname, '../database/decorations.json')
};

module.exports = {
    async execute(interaction) {
        const customId = interaction.customId;
        
        try {
            // Xử lý button "Yêu Cầu Khi Mua"
            if (customId.startsWith('buy_request_')) {
                const productName = customId.replace('buy_request_', '');
                
                // Đọc dữ liệu sản phẩm
                const products = JSON.parse(await fs.readFile(DB_PATH.products, 'utf8'));
                const product = products.items.find(prod => 
                    prod.name.toLowerCase() === productName.toLowerCase()
                );
                
                if (!product) {
                    return await interaction.reply({
                        content: '❌ Không tìm thấy sản phẩm!',
                        ephemeral: true
                    });
                }
                
                // Debug log
                console.log('Product found:', product.name);
                console.log('Request content from DB:', product.requestContent);
                console.log('Has requestContent:', !!product.requestContent);
                
                // Sử dụng nội dung từ database hoặc fallback
                const requestContent = product.requestContent || [
                    '**Hướng dẫn mua hàng:**',
                    '1. Tạo ticket trong server Discord',
                    '2. Cung cấp thông tin sản phẩm bạn muốn mua',
                    '3. Chờ admin xác nhận và hướng dẫn thanh toán',
                    '4. Thanh toán theo hướng dẫn của admin',
                    '',
                    '**Lưu ý quan trọng:**',
                    '• Chỉ thanh toán sau khi admin xác nhận',
                    '• Không tự ý chuyển khoản trước khi được xác nhận',
                    '• Liên hệ admin nếu có thắc mắc'
                ].join('\n');
                
                console.log('Final requestContent:', requestContent);

                const embed = new EmbedBuilder()
                    .setTitle('🛒 Yêu Cầu Khi Mua')
                    .setDescription([
                        `**Sản phẩm:** ${product.name}`,
                        `**Giá:** ${product.price.toLocaleString()}₫`,
                        '',
                        requestContent
                    ].join('\n'))
                    .setColor('#6A6AFF')
                    .setTimestamp()
                    .setFooter({ 
                        text: 'Iris Market • Premium Products & Services', 
                        iconURL: config.IMG 
                    });
                
                await interaction.reply({
                    embeds: [embed],
                    ephemeral: true
                });
            }
            
            // Xử lý button "Term of Service"
            if (customId.startsWith('tos_')) {
                const productName = customId.replace('tos_', '');
                
                // Đọc dữ liệu sản phẩm
                const products = JSON.parse(await fs.readFile(DB_PATH.products, 'utf8'));
                const product = products.items.find(prod => 
                    prod.name.toLowerCase() === productName.toLowerCase()
                );
                
                if (!product) {
                    return await interaction.reply({
                        content: '❌ Không tìm thấy sản phẩm!',
                        ephemeral: true
                    });
                }
                
                // Debug log
                console.log('Product found (TOS):', product.name);
                console.log('TOS content from DB:', product.tosContent);
                console.log('Has tosContent:', !!product.tosContent);
                
                // Sử dụng nội dung từ database hoặc fallback
                const tosContent = product.tosContent || [
                    '**Điều khoản dịch vụ:**',
                    '',
                    '**1. Quy định chung:**',
                    '• Sản phẩm được cung cấp "như hiện tại"',
                    '• Không hoàn tiền sau khi giao dịch hoàn tất',
                    '• Khách hàng chịu trách nhiệm bảo mật thông tin',
                    '',
                    '**2. Quyền lợi khách hàng:**',
                    '• Hỗ trợ 24/7 qua ticket system',
                    '• Bảo hành sản phẩm theo chính sách',
                    '• Đổi trả trong vòng 24h nếu lỗi từ phía chúng tôi',
                    '',
                    '**3. Trách nhiệm:**',
                    '• Admin có quyền từ chối giao dịch nếu vi phạm',
                    '• Khách hàng phải tuân thủ quy định Discord',
                    '• Không sử dụng sản phẩm cho mục đích bất hợp pháp',
                    '',
                    'Bằng việc mua hàng, bạn đồng ý với các điều khoản trên.'
                ].join('\n');
                
                console.log('Final tosContent:', tosContent);

                const embed = new EmbedBuilder()
                    .setTitle('📄 Term of Service')
                    .setDescription([
                        `**Sản phẩm:** ${product.name}`,
                        `**Giá:** ${product.price.toLocaleString()}₫`,
                        '',
                        tosContent
                    ].join('\n'))
                    .setColor('#2D2D33')
                    .setTimestamp()
                    .setFooter({ 
                        text: 'Iris Market • Premium Products & Services', 
                        iconURL: config.IMG 
                    });
                
                await interaction.reply({
                    embeds: [embed],
                    ephemeral: true
                });
            }
            
            // Xử lý các button khác
            // Xử lý category buttons từ addproduct
            if (customId.startsWith('category_')) {
                const categoryName = customId.replace('category_', '');
                
                // Đọc dữ liệu danh mục
                const categoriesData = await fs.readFile(DB_PATH.categories, 'utf8');
                const categories = JSON.parse(categoriesData);
                
                // Tìm category
                const category = categories.items.find(cat => 
                    cat.name.toLowerCase() === categoryName.toLowerCase()
                );
                if (!category) {
                    return await interaction.reply({
                        content: '❌ Không tìm thấy danh mục!',
                        ephemeral: true
                    });
                }
                
                const embed = new EmbedBuilder()
                    .setTitle('📝 Nhập Thông Tin Sản Phẩm')
                    .setDescription([
                        `**Danh mục đã chọn:** ${categoryName}`,
                        '',
                        '**Tiếp theo:**',
                        'Sử dụng lệnh prefix để thêm sản phẩm:',
                        '',
                        '`!addproduct <tën_sp> <mô_tả> <giá> "${categoryName}"`',
                        '',
                        '**Ví dụ:**',
                        `\`!addproduct "名稱" "描述" 100000 "${categoryName}"\``,
                        '',
                        '**Lưu ý:**',
                        '• Đặt tên và mô tả trong dấu ngoặc kép',
                        '• Giá phải là số',
                        '• Danh mục cần khớp chính xác'
                    ].join('\n'))
                    .setColor('#0099ff')
                    .setTimestamp()
                    .setFooter({ text: 'Iris Market • Quản lý sản phẩm' });
                
                await interaction.reply({
                    embeds: [embed],
                    ephemeral: true
                });
                
                return;
            }

            // Xử lý decoration buttons
            // Buy decoration request button
            if (customId.startsWith('buy_deco_request_')) {
                const decorationName = customId.replace('buy_deco_request_', '');
                
                // Đọc dữ liệu decorations
                const decorations = JSON.parse(await fs.readFile(DB_PATH.decorations, 'utf8'));
                const decoration = decorations.items.find(deco => 
                    deco.name.toLowerCase() === decorationName.toLowerCase()
                );
                
                if (!decoration) {
                    return await interaction.reply({
                        content: '❌ Không tìm thấy decoration!',
                        ephemeral: true
                    });
                }

                // Sử dụng nội dung từ database hoặc fallback
                const requestContent = decoration.requestContent || [
                    '**Hướng dẫn mua decoration:**',
                    '1. Chọn decoration bạn muốn mua',
                    '2. Liên hệ admin qua ticket',
                    '3. Thanh toán theo hướng dẫn',
                    '4. Nhận decoration item',
                    '',
                    '**Lưu ý:**',
                    '• Kiểm tra giá Nitro và Non-Nitro',
                    '• Đọc kỹ điều khoản dịch vụ'
                ].join('\n');

                const embed = new EmbedBuilder()
                    .setTitle('🎨 Yêu Cầu Mua Decoration')
                    .setDescription([
                        `**Decoration:** ${decoration.name}`,
                        `**Giá with Nitro:** ${decoration.prices.withNitro.avatar.toLocaleString()}₫`,
                        `**Giá without Nitro:** ${decoration.prices.withoutNitro.avatar.toLocaleString()}₫`,
                        '',
                        requestContent
                    ].join('\n'))
                    .setColor('#6A6AFF')
                    .setTimestamp()
                    .setFooter({ text: 'Iris Market • Decoration Store' });

                await interaction.reply({
                    embeds: [embed],
                    ephemeral: true
                });
            }

            // Decoration TOS button
            if (customId.startsWith('deco_tos_')) {
                const decorationName = customId.replace('deco_tos_', '');
                
                // Đọc dữ liệu decorations
                const decorations = JSON.parse(await fs.readFile(DB_PATH.decorations, 'utf8'));
                const decoration = decorations.items.find(deco => 
                    deco.name.toLowerCase() === decorationName.toLowerCase()
                );
                
                if (!decoration) {
                    return await interaction.reply({
                        content: '❌ Không tìm thấy decoration!',
                        ephemeral: true
                    });
                }

                // Sử dụng nội dung từ database hoặc fallback
                const tosContent = decoration.tosContent || [
                    '**Điều khoản dịch vụ Decoration:**',
                    '',
                    '**1. Quy định:**',
                    '• Decoration chỉ áp dụng cho một tài khoản',
                    '• Không hoàn tiền sau khi giao dịch',
                    '• Có thể thay đổi giá theo thời gian',
                    '',
                    '**2. Quyền lợi:**',
                    '• Hỗ trợ setup miễn phí',
                    '• Bảo hành sản phẩm',
                    '• Tư vấn 24/7',
                    '',
                    '**3. Lưu ý:**',
                    '• Decoration phụ thuộc vào Discord Nitro',
                    '• Không chịu trách nhiệm nếu Discord thay đổi chính sách'
                ].join('\n');

                const embed = new EmbedBuilder()
                    .setTitle('📄 Term of Service - Decoration')
                    .setDescription([
                        `**Decoration:** ${decoration.name}`,
                        '',
                        tosContent
                    ].join('\n'))
                    .setColor('#2D2D33')
                    .setTimestamp()
                    .setFooter({ text: 'Iris Market • Decoration Store' });

                await interaction.reply({
                    embeds: [embed],
                    ephemeral: true
                });
            }
            
        } catch (error) {
            console.error('Error in buttonHandler:', error);
            await interaction.reply({
                content: '❌ Có lỗi xảy ra khi xử lý button!',
                ephemeral: true
            });
        }
    }
};