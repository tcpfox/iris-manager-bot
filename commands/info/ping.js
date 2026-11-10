const { EmbedBuilder } = require('discord.js');

module.exports = {
    name: 'ping',
    description: 'Kiểm tra ping của bot',
    
    async execute(message) {
        const embed = new EmbedBuilder()
            .setTitle('🏓 Pong!')
            .setDescription(`**Latency:** ${Date.now() - message.createdTimestamp}ms\n**API Latency:** ${Math.round(message.client.ws.ping)}ms`)
            .setColor(message.client.config.COLORS.SUCCESS)
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    }
};