const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const path = require('path');
const warrantyUtils = require('../utils/warrantyUtils');

module.exports = {
    name: 'guildMemberRemove',
    async execute(member) {
        const client = member.client;
        const config = client.config;

        try {
            // Cập nhật trạng thái rời server cho tất cả đơn hàng của user
            const updatedCount = await warrantyUtils.markUserLeftServer(
                member.id,
                new Date().toISOString()
            );
            
            console.log(`✅ Đã đánh dấu user ${member.user.username} (${member.id}) rời server - hủy bảo hành ${updatedCount} đơn hàng`);

            // Gửi tin nhắn goodbye nếu có cấu hình
            if (config.GOODBYE_CHANNEL) {
                try {
                    const goodbyeEmbed = new EmbedBuilder()
                        .setColor('#ff6b6b')
                        .setTitle('👋 Goodbye')
                        .setDescription(`${member.user} đã rời khỏi **${member.guild.name}**`)
                        .setFooter({ text: 'Iris Market', iconURL: config.IMG })
                        .setTimestamp()
                        .setThumbnail(member.user.displayAvatarURL());

                    let attachment = null;
                    let messageOptions = { embeds: [goodbyeEmbed] };

                    if (config.GOODBYE_IMAGE) {
                        try {
                            const filePath = path.join(__dirname, '../img', config.GOODBYE_IMAGE);
                            attachment = new AttachmentBuilder(filePath, { name: config.GOODBYE_IMAGE });
                            goodbyeEmbed.setImage(`attachment://${config.GOODBYE_IMAGE}`);
                            messageOptions.files = [attachment];
                        } catch (imageError) {
                            console.log('⚠️ Không thể tải hình goodbye:', imageError.message);
                        }
                    }

                    const goodbyeChannel = client.channels.cache.get(config.GOODBYE_CHANNEL);
                    if (goodbyeChannel) {
                        await goodbyeChannel.send(messageOptions);
                    }
                } catch (error) {
                    console.error('❌ Lỗi gửi tin nhắn goodbye:', error);
                }
            }
        } catch (error) {
            console.error('❌ Lỗi xử lý khi user rời server:', error);
        }
    }
};

