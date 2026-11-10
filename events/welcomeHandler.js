const { EmbedBuilder, AttachmentBuilder } = require('discord.js');
const path = require('path');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member) {
        const client = member.client;
        const config = client.config;

        // Kiểm tra xem có cấu hình kênh welcome không
        if (!config.WELCOME_CHANNEL) {
            console.log('⚠️ Không có cấu hình WELCOME_CHANNEL trong config.json');
            return;
        }

        try {
            // Tạo embed chào mừng
            const welcomeEmbed = new EmbedBuilder()
                .setColor(Math.floor(Math.random() * 0xFFFFFF))
                .setTitle('**_WELCOME TO Iris Market_**')
                .setDescription(`Xin chào ${member.user}, Chào mừng bạn đến với **${member.guild.name}**!\n > - Hãy đọc kỹ các quy định trong kênh <#1318584958566137936>.\n > - Kiểm tra giá cả trước khi mua tại: <#1318584958910206063>.\n > - Mua hàng ở: <#1318584959467782237>.\n > - Không tin tưởng? Hãy kiểm tra uy tín shop tại: <#1318584959467782239>.`)
                .setFooter({ text: 'Iris Market', iconURL: config.IMG })
                .setTimestamp()
                .setThumbnail(member.user.displayAvatarURL());

            // Tạo attachment từ file ảnh
            let attachment = null;
            let messageOptions = { embeds: [welcomeEmbed] };

            if (config.WELCOME_IMAGE) {
                try {
                    const filePath = path.join(__dirname, '../img', config.WELCOME_IMAGE);
                    attachment = new AttachmentBuilder(filePath, { name: config.WELCOME_IMAGE });
                    welcomeEmbed.setImage(`attachment://${config.WELCOME_IMAGE}`);
                    messageOptions.files = [attachment];
                } catch (imageError) {
                    console.log('⚠️ Không thể tải hình welcome:', imageError.message);
                    // Vẫn gửi embed nhưng không có hình
                }
            }

            // Lấy kênh chào mừng từ config
            const welcomeChannel = client.channels.cache.get(config.WELCOME_CHANNEL);
            if (!welcomeChannel) {
                console.error(`❌ Không tìm thấy kênh welcome với ID: ${config.WELCOME_CHANNEL}`);
                return;
            }

            // Gửi tin nhắn chào mừng
            await welcomeChannel.send(messageOptions);
            
            console.log(`✅ Đã gửi tin nhắn chào mừng cho ${member.user.username} (${member.user.id})`);

        } catch (error) {
            console.error('❌ Lỗi gửi tin nhắn chào mừng:', error);
        }
    }
};