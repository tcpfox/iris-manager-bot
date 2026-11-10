const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const config = require('../../config.json');
const { hasStaffRole } = require('../../utils/helpers');

const DB_PATH = path.join(__dirname, '../../database/orders.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addorder')
        .setDescription('➕ Thêm đơn hàng cho khách hàng')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('👤 Khách hàng cần thêm đơn hàng')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('ordername')
                .setDescription('📦 Tên đơn hàng')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('price')
                .setDescription('💵 Giá tiền (VND)')
                .setRequired(true))
        .addBooleanOption(option =>
            option.setName('warranty')
                .setDescription('🛡️ Có bảo hành (mặc định: có)')
                .setRequired(false)),

    async execute(interaction) {
        try {
            // Kiểm tra quyền staff
            const member = await interaction.guild.members.fetch(interaction.user.id);
            if (!hasStaffRole(member)) {
                return await interaction.reply({
                    content: '❌ Chỉ có staff mới có thể sử dụng lệnh này!',
                    ephemeral: true
                });
            }

            await interaction.deferReply({ ephemeral: false });

            const user = interaction.options.getUser('user');
            const orderName = interaction.options.getString('ordername');
            const price = interaction.options.getInteger('price');
            const hasWarranty = interaction.options.getBoolean('warranty') !== false; // Mặc định true nếu không chỉ định

            // Always use current date as purchase date
            const purchaseDate = new Date();

            // Generate unique order ID
            const orderId = `ORD${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

            // Lấy thông tin người bán từ DEFAULT_SELLER_USERNAME trong config
            const defaultSellerUsername = config.WARRANTY?.DEFAULT_SELLER_USERNAME || 'tcpfox.v3';
            let defaultSellerId = null;
            let defaultSellerUser = null;
            
            // Tìm user theo username trong guild để lấy ID và user object
            try {
                const members = await interaction.guild.members.fetch();
                const defaultSellerMember = members.find(m => 
                    m.user.username === defaultSellerUsername || 
                    m.user.username.toLowerCase() === defaultSellerUsername.toLowerCase() ||
                    m.displayName === defaultSellerUsername ||
                    m.displayName.toLowerCase() === defaultSellerUsername.toLowerCase()
                );
                
                if (defaultSellerMember) {
                    defaultSellerId = defaultSellerMember.user.id;
                    defaultSellerUser = defaultSellerMember.user;
                }
            } catch (error) {
                console.error(`⚠️ Không tìm thấy default seller: ${defaultSellerUsername} - ${error.message}`);
            }

            // Read existing orders
            let ordersData;
            try {
                const data = await fs.readFile(DB_PATH, 'utf8');
                ordersData = JSON.parse(data);
            } catch (error) {
                ordersData = { orders: [] };
            }

            // Create new order
            const newOrder = {
                orderId: orderId,
                userId: user.id,
                username: user.username,
                orderName: orderName,
                price: price,
                purchaseDate: purchaseDate.toISOString(),
                addedBy: defaultSellerId || interaction.user.id, // Sử dụng default seller ID, nếu không tìm thấy thì dùng người chạy lệnh
                addedAt: new Date().toISOString(),
                channelId: interaction.channel.id, // Lưu channel nơi tạo đơn (ticket channel)
                // Warranty fields
                hasWarranty: hasWarranty, // Có bảo hành hay không
                hasFeedback: false,
                warrantyEligible: hasWarranty ? true : false, // Nếu không có bảo hành thì warrantyEligible = false
                leftServer: false
            };

            // Add order to database
            ordersData.orders.push(newOrder);
            await fs.writeFile(DB_PATH, JSON.stringify(ordersData, null, 4));

            // Format date for display
            const formattedDate = purchaseDate.toLocaleDateString('vi-VN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });

            const embed = new EmbedBuilder()
                .setTitle('✅ Thêm Đơn Hàng Thành Công')
                .setDescription([
                    `**Mã Đơn:** \`${orderId}\``,
                    `**Khách Hàng:** ${user} (${user.username})`,
                    `**Tên Đơn Hàng:** ${orderName}`,
                    `**Giá Tiền:** ${price.toLocaleString('vi-VN')}đ`,
                    `**Ngày Mua:** ${formattedDate}`,
                    `**Bảo Hành:** ${hasWarranty ? '✅ Có' : '❌ Không'}`,
                    '',
                    'Đơn hàng đã được thêm vào hệ thống!',
                    hasWarranty ? '' : '⚠️ **Lưu ý:** Mặt hàng này không có bảo hành, nhưng feedback vẫn là bắt buộc.'
                ].join('\n'))
                .setColor('#00ff00')
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .setTimestamp()
                .setFooter({ text: 'Iris Manager • Powered By Iris Studio', iconURL: config.IMG });

            await interaction.editReply({
                embeds: [embed]
            });

            // Sử dụng default seller đã tìm ở trên
            const seller = defaultSellerUser || `@${defaultSellerUsername}`;
            
            // Tạo embed yêu cầu feedback
            const feedbackEmbed = new EmbedBuilder()
                .setTitle('📝 Đơn Hàng Hoàn Thành')
                .setDescription([
                    `👋 Xin chào ${user}!`,
                    '',
                    '📦 **Thông tin đơn hàng:**',
                    `🆔 **Mã Đơn:** \`${orderId}\``,
                    `📋 **Tên Đơn Hàng:** ${orderName}`,
                    `💰 **Giá Tiền:** ${price.toLocaleString('vi-VN')}đ`,
                    '',
                    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
                    '',
                    '📌 **Vui lòng feedback theo đúng định dạng sau:**',
                    '```yaml',
                    `+1 legit ${seller} ${orderName}`,
                    '```',
                    '',
                    '⚠️ **Lưu ý quan trọng:**',
                    '✅ Feedback **PHẢI** đúng định dạng trên',
                    `👤 **PHẢI** tag tên người bán (${seller})`,
                    '👤 Khuyến khích feedback kèm theo với ảnh',
                    '❌ Không đúng định dạng hoặc không tag người bán → Feedback **KHÔNG HỢP LỆ**',
                    '',
                    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
                    '',
                    '🙏 Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi!'
                ].join('\n'))
                .setColor('#0099ff')
                .setThumbnail(user.displayAvatarURL({ dynamic: true }))
                .setTimestamp()
                .setFooter({ text: 'Iris Manager • Powered By Iris Studio', iconURL: config.IMG });

            // Gửi embed yêu cầu feedback vào kênh ticket
            try {
                await interaction.channel.send({
                    content: `${user}`,
                    embeds: [feedbackEmbed]
                });
                console.log(`✅ Đã gửi yêu cầu feedback vào kênh ticket cho đơn ${orderId}`);
            } catch (error) {
                console.error('⚠️ Không thể gửi yêu cầu feedback vào kênh ticket:', error.message);
            }

            // Gửi embed yêu cầu feedback vào DM của khách hàng
            try {
                await user.send({ embeds: [feedbackEmbed] });
                console.log(`✅ Đã gửi yêu cầu feedback vào DM của khách hàng ${user.username} cho đơn ${orderId}`);
            } catch (error) {
                console.error(`⚠️ Không thể gửi DM cho khách hàng ${user.username}:`, error.message);
            }

        } catch (error) {
            console.error('Error in addorder command:', error);
            await interaction.editReply({
                content: '❌ Đã xảy ra lỗi khi thêm đơn hàng.',
                ephemeral: true
            });
        }
    }
};

