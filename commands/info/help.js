const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'help',
    description: 'Hướng dẫn sử dụng bot',
    
    async execute(message) {
		const embed = new EmbedBuilder()
			.setTitle('📚 HƯỚNG DẪN SỬ DỤNG BOT')
			.setColor(message.client.config.COLORS.INFO)
			.addFields(
				{ 
					name: '💬 Prefix Commands', 
					value: [
						`\`${message.client.config.PREFIX}help\` - Xem hướng dẫn`,
						`\`${message.client.config.PREFIX}ping\` - Kiểm tra ping`,
						'',
						'🛍️ STORE:',
						`\`${message.client.config.PREFIX}addorder @user <tên đơn> <giá>\` - Thêm đơn hàng`,
						`\`${message.client.config.PREFIX}checkorder <mã đơn | ORDxxxx>\` - Xem chi tiết đơn + bảo hành`,
						`\`${message.client.config.PREFIX}info [@user]\` - Thông tin khách + thống kê bảo hành`
					].join('\n'),
					inline: false 
				},
				{ 
					name: '⚡ Slash Commands', 
					value: [
						'\`/info\` - Thông tin bot',
						'\`/ping\` - Kiểm tra ping',
						'\`/reload\` - Reload bot (Owner only)',
						'',
						'🛍️ STORE:',
						'\`/addorder user:@user ordername:<tên đơn> price:<giá>\` - Thêm đơn hàng',
						'\`/checkorder orderid:<mã đơn | ORDxxxx>\` - Xem chi tiết đơn + bảo hành',
						'\`/info user:@user\` - Thông tin khách + thống kê bảo hành'
					].join('\n'),
					inline: false 
				},
				{
					name: '🛡️ Bảo hành & Feedback',
					value: [
						`• Thời hạn feedback: \`${message.client.config.WARRANTY?.FEEDBACK_DEADLINE_HOURS ?? 24} giờ\``,
						'• Nếu khách feedback đúng hạn → đơn được bảo hành',
						'• Nếu khách không feedback trong hạn → đơn không được bảo hành',
						'• Nếu khách rời server → tất cả đơn trước ngày rời không được bảo hành',
						'• Gửi feedback trong kênh feedback bằng định dạng:',
						'```yaml',
						'+1 legit @người-bán <tên sản phẩm> [ảnh]',
						'```'
					].join('\n'),
					inline: false
				},
				{ 
					name: '💡 Ghi chú', 
					value: [
						'• Có thể dùng cả slash command (/) và prefix command (!).',
						'• \`ORD\` là prefix của mã đơn, bạn có thể nhập \`ORDxxxx\` hoặc chỉ số đằng sau.'
					].join('\n'), 
					inline: false 
				}
			)
			.setFooter({ text: 'Iris Market' });

        await message.reply({ embeds: [embed] });
    }
};