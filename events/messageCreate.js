const { isOwner } = require('../utils/helpers');

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        // Bỏ qua tin nhắn từ bot
        if (message.author.bot) return;

        // Kiểm tra prefix
        if (!message.content.startsWith(message.client.config.PREFIX)) return;

        const args = message.content.slice(message.client.config.PREFIX.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        const command = message.client.prefixCommands.get(commandName);
        if (!command) return;

        // Kiểm tra quyền admin nếu cần
        if (command.adminOnly && !isOwner(message.author.id)) {
            return message.reply('❌ Chỉ có admin mới có thể sử dụng lệnh này!');
        }

        try {
            await command.execute(message, args);
        } catch (error) {
            console.error('❌ Lỗi thực thi prefix command:', error);
            await message.reply('❌ Có lỗi xảy ra khi thực thi lệnh!');
        }
    }
};