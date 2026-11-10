const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reload')
        .setDescription('Reload bot commands and events (Owner only)')
        .addStringOption(option => 
            option.setName('type')
                .setDescription('What to reload')
                .setRequired(true)
                .addChoices(
                    { name: 'Slash Commands', value: 'slash' },
                    { name: 'Prefix Commands', value: 'prefix' },
                    { name: 'Events', value: 'events' },
                    { name: 'All', value: 'all' }
                )),
    
    async execute(interaction) {
        // Check if user is owner
        const config = interaction.client.config;
        if (interaction.user.id !== config.OWNER_ID) {
            return interaction.reply({
                content: '❌ Only the bot owner can use this command!',
                ephemeral: true
            });
        }

        const type = interaction.options.getString('type');
        
        await interaction.deferReply({ ephemeral: true });

        let results = [];
        
        try {
            switch (type) {
                case 'slash':
                    results = await reloadSlashCommands(interaction.client);
                    break;
                case 'prefix':
                    results = await reloadPrefixCommands(interaction.client);
                    break;
                case 'events':
                    results = await reloadEvents(interaction.client);
                    break;
                case 'all':
                    const slashRes = await reloadSlashCommands(interaction.client);
                    const prefixRes = await reloadPrefixCommands(interaction.client);
                    const eventRes = await reloadEvents(interaction.client);
                    results = [...slashRes, ...prefixRes, ...eventRes];
                    break;
            }

            // Create result embed
            const embed = new EmbedBuilder()
                .setTitle('🔄 Reload Results')
                .setColor(config.COLORS.SUCCESS)
                .setTimestamp();

            const success = results.filter(r => r.success).length;
            const failed = results.filter(r => !r.success).length;

            embed.setDescription(
                `✅ **Success:** ${success}\n` +
                `❌ **Failed:** ${failed}\n` +
                `📊 **Total:** ${results.length}`
            );

            if (success > 0) {
                const successList = results
                    .filter(r => r.success)
                    .map(r => `✅ ${r.name}`)
                    .slice(0, 10)
                    .join('\n');
                
                if (successList) {
                    embed.addFields({ 
                        name: 'Successful Reloads', 
                        value: successList || 'None', 
                        inline: false 
                    });
                }
            }

            if (failed > 0) {
                const failList = results
                    .filter(r => !r.success)
                    .map(r => `❌ ${r.name}`)
                    .slice(0, 5)
                    .join('\n');
                
                if (failList) {
                    embed.addFields({ 
                        name: 'Failed Reloads', 
                        value: failList || 'None', 
                        inline: false 
                    });
                }
            }

            // Re-register slash commands if needed
            if (type === 'slash' || type === 'all') {
                await registerSlashCommands(interaction.client);
                embed.addFields({
                    name: '🚀 API Registration',
                    value: 'Slash commands re-registered with Discord!',
                    inline: false
                });
            }

            await interaction.editReply({ embeds: [embed] });

        } catch (error) {
            console.error('Reload error:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Reload Error')
                .setDescription(`Error occurred during reload:\n\`\`\`${error.message}\`\`\``)
                .setColor(config.COLORS.ERROR);
            
            await interaction.editReply({ embeds: [errorEmbed] });
        }
    },
};

// Recursive reload functions
function clearRequireCacheRecursive(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
            clearRequireCacheRecursive(itemPath);
        } else if (item.endsWith('.js')) {
            delete require.cache[require.resolve(itemPath)];
        }
    }
}

function reloadSlashCommands(client) {
    const results = [];
    
    try {
        const slashPath = path.join(__dirname, '../../slashCommands');
        if (!fs.existsSync(slashPath)) {
            return [{ name: 'slashCommands folder', success: false }];
        }
        
        // Clear cache recursively
        clearRequireCacheRecursive(slashPath);
        
        // Clear current commands
        client.slashCommands.clear();
        
        // Reload recursively
        loadSlashCommandsRecursive(slashPath, client, results);
        
    } catch (error) {
        console.error('Error reloading slash commands:', error);
        results.push({ name: 'slash commands', success: false });
    }
    
    return results;
}

function loadSlashCommandsRecursive(dir, client, results) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
            loadSlashCommandsRecursive(itemPath, client, results);
        } else if (item.endsWith('.js')) {
            try {
                const command = require(itemPath);
                if (command.data && command.execute) {
                    client.slashCommands.set(command.data.name, command);
                    results.push({ name: `slash/${command.data.name}`, success: true });
                } else {
                    results.push({ name: `slash/${item}`, success: false });
                }
            } catch (err) {
                results.push({ name: `slash/${item}`, success: false });
            }
        }
    }
}

function reloadPrefixCommands(client) {
    const results = [];
    
    try {
        const prefixPath = path.join(__dirname, '../../commands');
        if (!fs.existsSync(prefixPath)) {
            return [{ name: 'commands folder', success: false }];
        }
        
        clearRequireCacheRecursive(prefixPath);
        client.prefixCommands.clear();
        loadPrefixCommandsRecursive(prefixPath, client, results);
        
    } catch (error) {
        results.push({ name: 'prefix commands', success: false });
    }
    
    return results;
}

function loadPrefixCommandsRecursive(dir, client, results) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
            loadPrefixCommandsRecursive(itemPath, client, results);
        } else if (item.endsWith('.js')) {
            try {
                const command = require(itemPath);
                if (command.name && command.execute) {
                    // Lưu command với tên chính
                    client.prefixCommands.set(command.name, command);
                    results.push({ name: `prefix/${command.name}`, success: true });
                    
                    // Lưu command với tất cả aliases
                    if (command.aliases && Array.isArray(command.aliases)) {
                        for (const alias of command.aliases) {
                            client.prefixCommands.set(alias, command);
                        }
                    }
                } else {
                    results.push({ name: `prefix/${item}`, success: false });
                }
            } catch (err) {
                results.push({ name: `prefix/${item}`, success: false });
            }
        }
    }
}

function reloadEvents(client) {
    const results = [];
    
    try {
        const eventsPath = path.join(__dirname, '../../events');
        if (!fs.existsSync(eventsPath)) {
            return [{ name: 'events folder', success: false }];
        }
        
        const files = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));
        
        for (const file of files) {
            try {
                const filePath = path.join(eventsPath, file);
                delete require.cache[require.resolve(filePath)];
                const event = require(filePath);
                
                if (event.name && event.execute) {
                    client.removeAllListeners(event.name);
                    
                    if (event.once) {
                        client.once(event.name, (...args) => event.execute(...args));
                    } else {
                        client.on(event.name, (...args) => event.execute(...args));
                    }
                    
                    results.push({ name: `event/${event.name}`, success: true });
                } else {
                    results.push({ name: `event/${file}`, success: false });
                }
            } catch (err) {
                results.push({ name: `event/${file}`, success: false });
            }
        }
    } catch (error) {
        results.push({ name: 'events', success: false });
    }
    
    return results;
}

async function registerSlashCommands(client) {
    try {
        const commands = [];
        client.slashCommands.forEach(command => {
            if (command.data && command.data.toJSON) {
                commands.push(command.data.toJSON());
            }
        });

        await client.application.commands.set(commands);
        console.log(`🚀 Re-registered ${commands.length} slash commands`);
    } catch (error) {
        console.error('Failed to register slash commands:', error);
        throw error;
    }
}

