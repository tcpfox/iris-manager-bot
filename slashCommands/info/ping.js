const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Kiểm tra ping của bot'),
    
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🏓 Pong!')
            .setDescription(`**Latency:** ${Date.now() - interaction.createdTimestamp}ms\n**API Latency:** ${Math.round(interaction.client.ws.ping)}ms`)
            .setColor(interaction.client.config.COLORS.SUCCESS)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};