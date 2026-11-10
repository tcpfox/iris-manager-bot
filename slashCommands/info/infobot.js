const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('infobot')
        .setDescription('Thông tin về bot'),
    
    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('📊 THÔNG TIN BOT')
            .setColor(interaction.client.config.COLORS.INFO)
            .addFields(
                { name: '🤖 Bot Name', value: interaction.client.user.username, inline: true },
                { name: '🆔 Bot ID', value: interaction.client.user.id, inline: true },
                { name: '📅 Created', value: `<t:${Math.floor(interaction.client.user.createdTimestamp / 1000)}:F>`, inline: true },
                { name: '🌐 Servers', value: interaction.client.guilds.cache.size.toString(), inline: true },
                { name: '👥 Users', value: interaction.client.users.cache.size.toString(), inline: true },
                { name: '📝 Commands', value: `${interaction.client.slashCommands.size} slash, ${interaction.client.prefixCommands.size} prefix`, inline: true }
            )
            .setThumbnail(interaction.client.user.displayAvatarURL())
            .setTimestamp()
            .setFooter({ text: 'Bot Framework' });

        await interaction.reply({ embeds: [embed] });
    }
};

