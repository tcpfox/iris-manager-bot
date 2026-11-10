const { EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const config = require('../../config.json');

const DB_PATH = path.join(__dirname, '../../database/orders.json');

module.exports = {
    name: 'totalfeedback',
    description: 'Hiển thị tổng số lượng feedback trong server',
    usage: 'totalfeedback',
    aliases: ['tf', 'totalfb'],
    
    async execute(message) {
        try {
            // Đọc file orders.json
            let ordersData;
            try {
                const data = await fs.readFile(DB_PATH, 'utf8');
                ordersData = JSON.parse(data);
            } catch (error) {
                ordersData = { orders: [] };
            }

            // Đếm tổng số feedback
            const totalFeedback = ordersData.orders ? ordersData.orders.length : 0;

            // Tạo embed
            const embed = new EmbedBuilder()
                .setTitle('📊 Tổng Số Feedback')
                .setDescription(`**Tổng số feedback trong server:** \`${totalFeedback.toLocaleString('vi-VN')}\``)
                .setColor(config.COLORS.INFO)
                .setTimestamp()
                .setFooter({ text: 'Iris Market', iconURL: config.IMG });

            await message.reply({ embeds: [embed] });

        } catch (error) {
            console.error('Error in totalfeedback command:', error);
            await message.reply('❌ Đã xảy ra lỗi khi lấy thông tin feedback.');
        }
    }
};

