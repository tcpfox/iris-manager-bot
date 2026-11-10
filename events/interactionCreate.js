module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        // Xử lý slash commands
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.slashCommands.get(interaction.commandName);
            
            if (!command) {
                console.error(`❌ Không tìm thấy command: ${interaction.commandName}`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error('❌ Lỗi thực thi slash command:', error);
                const errorMsg = { 
                    content: '❌ Có lỗi xảy ra khi thực thi lệnh!', 
                    ephemeral: true 
                };
                
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(errorMsg);
                } else {
                    await interaction.reply(errorMsg);
                }
            }
        }

        // Xử lý button interactions
        if (interaction.isButton()) {
            const buttonHandler = require('../handlers/buttonHandler');
            await buttonHandler.execute(interaction);
        }

        // Xử lý select menu interactions
        if (interaction.isStringSelectMenu()) {
            const selectHandler = require('../handlers/selectHandler');
            await selectHandler.execute(interaction);
        }

        // Xử lý modal interactions
        if (interaction.isModalSubmit()) {
            const modalHandler = require('../handlers/modalHandler');
            await modalHandler.execute(interaction);
        }
    }
};