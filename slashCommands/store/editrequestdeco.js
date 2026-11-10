const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const config = require('../../config.json');

const DB_PATH = {
    decorations: path.join(__dirname, '../../database/decorations.json')
};

// Tạo choices cơ bản từ decorations.json
let decorationChoices = [];
try {
    const decorationsData = require('../../database/decorations.json');
    if (decorationsData.items && decorationsData.items.length > 0) {
        decorationChoices = decorationsData.items.map(deco => ({
            name: deco.name,
            value: deco.name
        }));
    }
} catch (error) {
    console.error('Error loading decoration choices:', error);
    decorationChoices = [];
}

// Tạo command builder với choices có sẵn
const commandBuilder = new SlashCommandBuilder()
    .setName('editrequestdeco')
    .setDescription('Chỉnh sửa yêu cầu mua hàng cho decoration')
    .addStringOption(option =>
        option.setName('decoration')
            .setDescription('Chọn decoration cần chỉnh sửa')
            .setRequired(true)
            .addChoices(...decorationChoices))
    .addStringOption(option =>
        option.setName('type')
            .setDescription('Loại nội dung cần chỉnh sửa')
            .setRequired(true)
            .addChoices(
                { name: 'Yêu Cầu Khi Mua', value: 'request' },
                { name: 'Term of Service', value: 'tos' }
            ))
    .addStringOption(option =>
        option.setName('content')
            .setDescription('Nội dung mới')
            .setRequired(true)
            .setMaxLength(1024));

module.exports = {
    data: commandBuilder,

    async execute(interaction) {
        try {
            await interaction.deferReply({ ephemeral: true });

            const decorationName = interaction.options.getString('decoration');
            const type = interaction.options.getString('type');
            const content = interaction.options.getString('content');

            // Đọc dữ liệu decorations
            const decorationsData = await fs.readFile(DB_PATH.decorations, 'utf8');
            const decorations = JSON.parse(decorationsData);

            // Tìm decoration
            const decorationIndex = decorations.items.findIndex(deco => 
                deco.name.toLowerCase() === decorationName.toLowerCase()
            );

            if (decorationIndex === -1) {
                return await interaction.editReply({
                    content: `❌ Không tìm thấy decoration "${decorationName}"!`,
                    ephemeral: true
                });
            }

            const decoration = decorations.items[decorationIndex];

            // Cập nhật nội dung theo type
            if (type === 'request') {
                decoration.requestContent = content;
            } else if (type === 'tos') {
                decoration.tosContent = content;
            }

            // Cập nhật database
            decorations.items[decorationIndex] = decoration;
            await fs.writeFile(DB_PATH.decorations, JSON.stringify(decorations, null, 4));

            const embed = new EmbedBuilder()
                .setTitle('✅ Chỉnh Sửa Yêu Cầu Decoration Thành Công')
                .setDescription([
                    `**Decoration:** ${decoration.name}`,
                    `**Loại:** ${type === 'request' ? 'Yêu Cầu Khi Mua' : 'Term of Service'}`,
                    `**Nội dung:** ${content}`,
                    '',
                    'Nội dung đã được cập nhật và sẽ hiển thị khi khách hàng nhấn vào button tương ứng.'
                ].join('\n'))
                .setColor('#ffaa00')
                .setTimestamp()
                .setFooter({ text: 'Iris Market • Quản lý decorations' });

            await interaction.editReply({
                embeds: [embed]
            });

        } catch (error) {
            console.error('Error in editrequestdeco command:', error);
            await interaction.editReply({
                content: '❌ Đã xảy ra lỗi khi chỉnh sửa.',
                ephemeral: true
            });
        }
    }
};
