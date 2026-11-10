const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const config = require('../config.json');

const DB_PATH = {
    categories: path.join(__dirname, '../database/categories.json'),
    products: path.join(__dirname, '../database/products.json')
};

module.exports = {
    async execute(interaction) {
        const customId = interaction.customId;
        const selectedValues = interaction.values;
        
        try {
            // Xử lý select menu cho panelprice
            if (customId === 'menu_select') {
                const categoryName = selectedValues[0].replace('category_', '');
                
                // Đọc dữ liệu
                const categories = JSON.parse(await fs.readFile(DB_PATH.categories, 'utf8'));
                const products = JSON.parse(await fs.readFile(DB_PATH.products, 'utf8'));
                
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
                
                // Tìm products trong category
                const categoryProducts = products.items.filter(product => product.categoryId === category.id);
                
                // Tạo embed
                const embed = new EmbedBuilder()
                    .setColor('#c8f0ff')
                    .setTitle(category.name)
                    .setDescription(category.description)
                    .setThumbnail(config.THUMB)
                    .setTimestamp()
                    .setFooter({ 
                        text: 'Iris Market • Premium Products & Services', 
                        iconURL: config.IMG 
                    });
                
                // Thêm thông tin thêm
                if (category.additionalInfo) {
                    embed.addFields({
                        name: '# Thông tin thêm',
                        value: category.additionalInfo,
                        inline: false
                    });
                } else {
                    embed.addFields({
                        name: '# Thông tin thêm',
                        value: 'Không có thông tin thêm',
                        inline: false
                    });
                }
                
                // Thêm danh sách sản phẩm
                if (categoryProducts.length > 0) {
                    const productList = categoryProducts.map(product => 
                        `**${product.name}:** Giá: ${product.price.toLocaleString()}₫`
                    ).join('\n');
                    
                    embed.addFields({
                        name: '# Danh sách sản phẩm',
                        value: productList,
                        inline: false
                    });
                } else {
                    embed.addFields({
                        name: '# Danh sách sản phẩm',
                        value: 'Chưa có sản phẩm nào trong danh mục này',
                        inline: false
                    });
                }
                
                // Tạo select menu cho sản phẩm
                let components = [];
                if (categoryProducts.length > 0) {
                    const productOptions = categoryProducts.map(product => ({
                        label: product.name,
                        value: product.name,
                        description: `${product.price.toLocaleString()}₫`
                    }));
                    
                    const productSelect = new StringSelectMenuBuilder()
                        .setCustomId('product_select')
                        .setPlaceholder('Chọn sản phẩm để xem chi tiết...')
                        .addOptions(productOptions);
                    
                    const row = new ActionRowBuilder()
                        .addComponents(productSelect);
                    
                    components.push(row);
                }
                
                await interaction.reply({
                    embeds: [embed],
                    components: components,
                    ephemeral: true
                });
            }
            
            // Xử lý select menu cho sản phẩm
            if (customId === 'product_select') {
                const productName = selectedValues[0];
                
                // Đọc dữ liệu
                const products = JSON.parse(await fs.readFile(DB_PATH.products, 'utf8'));
                
                // Tìm sản phẩm
                const product = products.items.find(prod => 
                    prod.name.toLowerCase() === productName.toLowerCase()
                );
                if (!product) {
                    return await interaction.reply({
                        content: '❌ Không tìm thấy sản phẩm!',
                        ephemeral: true
                    });
                }
                
                // Tạo embed chi tiết sản phẩm
                const embed = new EmbedBuilder()
                    .setColor('#00ff00')
                    .setTitle(`🛍️ ${product.name}`)
                    .setDescription([
                        '**[Chi tiết sản phẩm]**',
                        '',
                        `💰 **Giá:** ${product.price.toLocaleString()}₫`,
                        '',
                        '# Mô tả sản phẩm',
                        product.description
                    ].join('\n'))
                    .setImage(product.imageUrl || config.GIFIMG)
                    .setTimestamp()
                    .setFooter({ 
                        text: 'Iris Market • Premium Products & Services', 
                        iconURL: config.IMG 
                    });
                
                // Tạo buttons
                const row = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder()
                            .setCustomId(`buy_request_${product.name}`)
                            .setLabel('🛒 Yêu Cầu Khi Mua')
                            .setStyle(ButtonStyle.Primary),
                        new ButtonBuilder()
                            .setCustomId(`tos_${product.name}`)
                            .setLabel('📄 Term of Service')
                            .setStyle(ButtonStyle.Secondary)
                    );
                
                await interaction.reply({
                    embeds: [embed],
                    components: [row],
                    ephemeral: true
                });
            }
            
            // Xử lý select menu cho addproduct
            if (customId === 'select_category_for_addproduct') {
                const categoryName = selectedValues[0];
                
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
                        '`!addproduct <tên_sp> <mô_tả> <giá> "${categoryName}"`',
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
            
        } catch (error) {
            console.error('Error in selectHandler:', error);
            await interaction.reply({
                content: '❌ Có lỗi xảy ra khi xử lý lựa chọn!',
                ephemeral: true
            });
        }
    }
};