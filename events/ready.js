const Database = require('../database/database');
const autobank = require('../utils/autobank');
const warrantyAutoCheck = require('../utils/warrantyAutoCheck');

module.exports = {
    name: 'ready',
    once: true,
    async execute(client) {
        console.log(`✅ Bot đã online: ${client.user.tag}`);
        console.log(`📊 Đang hoạt động trên ${client.guilds.cache.size} server`);
        
        // Khởi tạo database
        client.db = new Database();
        await client.db.init();
        
        console.log('📦 Database đã sẵn sàng');
        
        // Khởi tạo hệ thống AutoBank
        console.log('🏦 Đang khởi động hệ thống AutoBank...');
        await autobank.initGoogleSheets();
        autobank.startTransactionCheck(client);
        
        // Khởi động hệ thống auto-check bảo hành
        console.log('🛡️ Đang khởi động hệ thống auto-check bảo hành...');
        warrantyAutoCheck.startAutoCheck(client);
        
        // Đăng ký slash commands
        const commands = [];
        client.slashCommands.forEach(command => {
            commands.push(command.data.toJSON());
        });

        try {
            await client.application.commands.set(commands);
            console.log('✅ Đã đăng ký slash commands thành công!');
        } catch (error) {
            console.error('❌ Lỗi đăng ký slash commands:', error);
        }

        // Set activity
        client.user.setActivity('Bot Framework 🤖', { type: 'PLAYING' });
    }
};