const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { uploadAttachmentToCatbox, uploadUrlToCatbox } = require('../utils/catbox');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('upload')
        .setDescription('📤 Tải ảnh lên catbox.moe và trả về link')
        .addAttachmentOption(option =>
            option.setName('image')
                .setDescription('Ảnh để upload (PNG/JPG/GIF/WebP, v.v.)')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('url')
                .setDescription('Link ảnh để upload (http:// hoặc https://)')
                .setRequired(false)),

    async execute(interaction) {
        try {
            // Defer reply để tránh timeout
            await interaction.deferReply({ ephemeral: false });

            const attachment = interaction.options.getAttachment('image');
            const imageUrl = interaction.options.getString('url');

            // Kiểm tra ít nhất một trong hai option phải có
            if (!attachment && !imageUrl) {
                return await interaction.editReply({
                    content: '❌ Vui lòng cung cấp **ảnh đính kèm** hoặc **link ảnh**!',
                    ephemeral: true
                });
            }

            let cdnLink = null;

            // Ưu tiên xử lý attachment nếu có
            if (attachment) {
                // Kiểm tra định dạng ảnh
                if (!attachment.contentType || !attachment.contentType.startsWith('image/')) {
                    return await interaction.editReply({
                        content: '❌ Vui lòng chọn **tệp ảnh** (PNG/JPG/GIF/WebP...).',
                        ephemeral: true
                    });
                }

                // Upload từ attachment
                cdnLink = await uploadAttachmentToCatbox(attachment);
            } else if (imageUrl) {
                // Upload từ URL
                cdnLink = await uploadUrlToCatbox(imageUrl);
            }

            if (cdnLink) {
                return await interaction.editReply({
                    content: `\`${cdnLink}\`\n${cdnLink}`
                });
            } else {
                return await interaction.editReply({
                    content: '❌ Upload thất bại. Vui lòng kiểm tra lại ảnh/link và thử lại sau.',
                    ephemeral: true
                });
            }

        } catch (error) {
            console.error('❌ Lỗi trong upload command:', error);
            try {
                await interaction.editReply({
                    content: `❌ Đã xảy ra lỗi: \`${error.message}\``,
                    ephemeral: true
                });
            } catch (e) {
                // Ignore nếu không thể edit reply
            }
        }
    }
};

