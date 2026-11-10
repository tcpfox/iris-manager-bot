const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const { createCanvas, loadImage } = require('canvas');
const path = require('path');
const config = require('../../config.json');
const autobank = require('../../utils/autobank');

module.exports = {
   data: new SlashCommandBuilder()
        .setName('hoadon')
        .setDescription('✨ Tạo hóa đơn thanh toán')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('🤵 Người mua hàng')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('amount')
                .setDescription('💵 Số tiền thanh toán (VD 50000 hoặc 50k)')
                .setRequired(true)),

    async execute(interaction) {
        await interaction.deferReply();
        
        const user = interaction.options.getUser('user');
        const amountStr = interaction.options.getString('amount');
        
        // Generate random order code (8 characters: letters and numbers)
        const orderCode = generateOrderCode();
        
        // Format transfer description: IRIS + 8 chars
        const description = `IRIS${orderCode}`;
        const descriptionEncoded = encodeURIComponent(description);
        
        let amount;
        try {
            amount = parseAmount(amountStr);
        } catch (error) {
            return interaction.editReply({
                content: "❌ **Số tiền không hợp lệ.** Vui lòng nhập số tiền chính xác (VD: 50000 hoặc 50k).",
                ephemeral: true
            });
        }

        try {
            // Generate QR URL using img.vietqr.io
            const qrUrl = `https://qr.sepay.vn/img?acc=96247IRISMARKET&bank=BIDV&amount=${amount}&des=${descriptionEncoded}&template=qronly`;
            
            // Load QR code from URL
            const qrImage = await loadImage(qrUrl);

            // Load template image
            const templatePath = path.join(__dirname, '../../img/qr.png');
            const templateImage = await loadImage(templatePath);

            // Create canvas matching the template size
            const canvas = createCanvas(templateImage.width, templateImage.height);
            const ctx = canvas.getContext('2d');

            // Draw meme background template
            ctx.drawImage(templateImage, 0, 0);

            // Draw QR code precisely in the white box
            const qrSize = 380;
            const qrX = 35;
            const qrY = 860;
            
            // Draw the QR image from vietqr.io into the box
            ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

            const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'payment.png' });
            const embed = new EmbedBuilder()
                .setColor('#1a73e8')
                .setTitle('💰 Mã QR Thanh Toán BIDV')
                .setDescription([
                    '```md',
                    '# Hướng dẫn thanh toán',
                    '1. Mở app Ngân Hàng',
                    '2. Chọn "Quét QR"', 
                    '3. Quét mã và kiểm tra thông tin',
                    '4. Xác nhận thanh toán',
                    '```'
                ].join('\n'))
                .addFields({
                    name: '📋 Thông tin đơn hàng',
                    value: [
                        '```md',
                        `🏦 Ngân Hàng: BIDV`,
                        `💳 Số Tài Khoản: 96247IRISMARKET`,
                        `💵 Số Tiền: ${amount.toLocaleString()}đ`,
                        `📝 Nội Dung: ${description}`,
                        `👤 Người Nhận: NGUYEN HUY HOANG`,
                        `🔢 Mã Đơn: ${description}`,
                        '```'
                    ].join('\n'),
                    inline: false
                })
                .setImage('attachment://payment.png')
                .setTimestamp()
                .setFooter({ text: 'Iris Market • Thanh toán an toàn', iconURL: config.IMG });

            const message = await interaction.editReply({ 
                embeds: [embed], 
                files: [attachment] 
            });

            // Check for payment
            autobank.addPendingPayment({
                userId: user.id,
                username: user.username,
                amount: amount,
                description: description,
                interaction: interaction,
                timestamp: Date.now()
            });

        } catch (error) {
            console.error('Error:', error);
            await interaction.editReply({
                content: '❌ Đã xảy ra lỗi. Vui lòng thử lại sau.',
                ephemeral: true
            });
        }
    }
};

// Helper function to generate random order code (8 characters: letters and numbers)
function generateOrderCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Helper function to parse amounts like "50k" to 50000
function parseAmount(amountStr) {
    // Remove any non-alphanumeric characters except 'k' and 'm'
    const cleanStr = amountStr.replace(/[^\d.km]/gi, '').toLowerCase();
    
    if (cleanStr.endsWith('k')) {
        const value = parseFloat(cleanStr.slice(0, -1));
        if (isNaN(value)) throw new Error('Invalid amount');
        return Math.round(value * 1000);
    } else if (cleanStr.endsWith('m')) {
        const value = parseFloat(cleanStr.slice(0, -1));
        if (isNaN(value)) throw new Error('Invalid amount');
        return Math.round(value * 1000000);
    } else {
        const value = parseFloat(cleanStr);
        if (isNaN(value)) throw new Error('Invalid amount');
        return Math.round(value);
    }
}