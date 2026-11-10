const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('./config.json');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Collections cho commands
client.slashCommands = new Collection();
client.prefixCommands = new Collection();
client.config = config;

// ===========================================
// RECURSIVE LOADING FUNCTIONS
// ===========================================

// Load Slash Commands (with subfolders)
function loadSlashCommands(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
            // Nếu là thư mục, đệ quy vào trong
            loadSlashCommands(itemPath);
        } else if (item.endsWith('.js')) {
            // Nếu là file .js, load command
            try {
                const command = require(itemPath);
                if ('data' in command && 'execute' in command) {
                    client.slashCommands.set(command.data.name, command);
                    console.log(`✅ Loaded slash command: ${command.data.name}`);
                } else {
                    console.log(`⚠️ Invalid slash command: ${itemPath}`);
                }
            } catch (error) {
                console.error(`❌ Error loading slash command ${itemPath}:`, error.message);
            }
        }
    }
}

// Load Prefix Commands (with subfolders)
function loadPrefixCommands(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
            // Nếu là thư mục, đệ quy vào trong
            loadPrefixCommands(itemPath);
        } else if (item.endsWith('.js')) {
            // Nếu là file .js, load command
            try {
                const command = require(itemPath);
                if ('name' in command && 'execute' in command) {
                    // Lưu command với tên chính
                    client.prefixCommands.set(command.name, command);
                    console.log(`✅ Loaded prefix command: ${command.name}`);
                    
                    // Lưu command với tất cả aliases
                    if (command.aliases && Array.isArray(command.aliases)) {
                        for (const alias of command.aliases) {
                            client.prefixCommands.set(alias, command);
                            console.log(`   ↳ Alias: ${alias}`);
                        }
                    }
                } else {
                    console.log(`⚠️ Invalid prefix command: ${itemPath}`);
                }
            } catch (error) {
                console.error(`❌ Error loading prefix command ${itemPath}:`, error.message);
            }
        }
    }
}

// Load Events (no subfolders)
function loadEvents(dir) {
    const eventFiles = fs.readdirSync(dir).filter(file => file.endsWith('.js'));
    
    for (const file of eventFiles) {
        const filePath = path.join(dir, file);
        try {
            const event = require(filePath);
            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args));
            } else {
                client.on(event.name, (...args) => event.execute(...args));
            }
            console.log(`✅ Loaded event: ${event.name}`);
        } catch (error) {
            console.error(`❌ Error loading event ${file}:`, error.message);
        }
    }
}

// ===========================================
// LOAD ALL COMPONENTS
// ===========================================

// Load Slash Commands
const slashCommandsPath = path.join(__dirname, 'slashCommands');
if (fs.existsSync(slashCommandsPath)) {
    console.log('🔄 Loading slash commands...');
    loadSlashCommands(slashCommandsPath);
} else {
    console.log('⚠️ slashCommands folder not found');
}

// Load Prefix Commands
const prefixCommandsPath = path.join(__dirname, 'commands');
if (fs.existsSync(prefixCommandsPath)) {
    console.log('🔄 Loading prefix commands...');
    loadPrefixCommands(prefixCommandsPath);
} else {
    console.log('⚠️ commands folder not found');
}

// Load Events
const eventsPath = path.join(__dirname, 'events');
if (fs.existsSync(eventsPath)) {
    console.log('🔄 Loading events...');
    loadEvents(eventsPath);
} else {
    console.log('⚠️ events folder not found');
}

// Khởi chạy bot
client.login(config.TOKEN);