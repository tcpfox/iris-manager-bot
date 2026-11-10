const { EmbedBuilder } = require('discord.js');
const { hasStaffRole } = require('../../utils/helpers');
const config = require('../../config.json');

module.exports = {
    name: 'role',
    description: 'Toggle a role for a user (add if missing, remove if present)',
    usage: 'role @user <roleName>',
    aliases: ['addrole', 'ar', 'togglerole'],
    
    async execute(message, args) {
        try {
            // Kiểm tra quyền: owner hoặc staff
            const member = await message.guild.members.fetch(message.author.id);
            if (!hasStaffRole(member)) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(config.COLORS.ERROR)
                    .setTitle('❌ Không có quyền')
                    .setDescription('Bạn không có quyền sử dụng lệnh này!')
                    .setTimestamp()
                    .setFooter({ 
                        text: 'Iris Market', 
                        iconURL: config.IMG 
                    });
                
                const reply = await message.reply({ embeds: [errorEmbed] });
                // Xóa tin nhắn lệnh và tin nhắn phản hồi sau 5 giây
                setTimeout(async () => {
                    try {
                        await message.delete().catch(() => {});
                        await reply.delete().catch(() => {});
                    } catch (error) {}
                }, 5000);
                return;
            }

            // Kiểm tra đủ tham số
            if (args.length < 2) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(config.COLORS.ERROR)
                    .setTitle('❌ Thiếu tham số')
                    .setDescription('Sử dụng: `role @user <roleName>`')
                    .setTimestamp()
                    .setFooter({ 
                        text: 'Iris Market', 
                        iconURL: config.IMG 
                    });
                
                const reply = await message.reply({ embeds: [errorEmbed] });
                setTimeout(async () => {
                    try {
                        await message.delete().catch(() => {});
                        await reply.delete().catch(() => {});
                    } catch (error) {}
                }, 5000);
                return;
            }

            // Lấy user được mention
            const targetUser = message.mentions.members.first();
            if (!targetUser) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(config.COLORS.ERROR)
                    .setTitle('❌ Lỗi')
                    .setDescription('Vui lòng tag người dùng!')
                    .setTimestamp()
                    .setFooter({ 
                        text: 'Iris Market', 
                        iconURL: config.IMG 
                    });
                
                const reply = await message.reply({ embeds: [errorEmbed] });
                setTimeout(async () => {
                    try {
                        await message.delete().catch(() => {});
                        await reply.delete().catch(() => {});
                    } catch (error) {}
                }, 5000);
                return;
            }

            // Lấy tên role (bỏ qua mention)
            const roleName = args.slice(1).join(' ').toLowerCase();

            // Tìm role
            const role = message.guild.roles.cache.find(r => 
                r.name.toLowerCase() === roleName
            );

            if (!role) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(config.COLORS.ERROR)
                    .setTitle('❌ Không tìm thấy role')
                    .setDescription(`Không tìm thấy role "${roleName}"`)
                    .setTimestamp()
                    .setFooter({ 
                        text: 'Iris Market', 
                        iconURL: config.IMG 
                    });
                
                const reply = await message.reply({ embeds: [errorEmbed] });
                setTimeout(async () => {
                    try {
                        await message.delete().catch(() => {});
                        await reply.delete().catch(() => {});
                    } catch (error) {}
                }, 5000);
                return;
            }

            // Kiểm tra bot có quyền quản lý role không
            if (role.position >= message.guild.members.me.roles.highest.position) {
                const errorEmbed = new EmbedBuilder()
                    .setColor(config.COLORS.ERROR)
                    .setTitle('❌ Không có quyền')
                    .setDescription('Bot không có quyền quản lý role này!')
                    .setTimestamp()
                    .setFooter({ 
                        text: 'Iris Market', 
                        iconURL: config.IMG 
                    });
                
                const reply = await message.reply({ embeds: [errorEmbed] });
                setTimeout(async () => {
                    try {
                        await message.delete().catch(() => {});
                        await reply.delete().catch(() => {});
                    } catch (error) {}
                }, 5000);
                return;
            }

            // Kiểm tra nếu là staff (không phải owner), chỉ có thể toggle role có position thấp hơn role staff của họ
            const isOwner = member.id === config.OWNER_ID;
            if (!isOwner) {
                // Lấy role staff cao nhất của user
                const staffRoles = config.STAFF_ROLES || [];
                const userStaffRoles = member.roles.cache.filter(r => staffRoles.includes(r.id));
                
                if (userStaffRoles.size > 0) {
                    // Lấy role staff có position cao nhất
                    const highestStaffRole = userStaffRoles.reduce((prev, curr) => 
                        curr.position > prev.position ? curr : prev
                    );
                    
                    // Kiểm tra role muốn toggle có position thấp hơn role staff không
                    if (role.position >= highestStaffRole.position) {
                        const errorEmbed = new EmbedBuilder()
                            .setColor(config.COLORS.ERROR)
                            .setTitle('❌ Không có quyền')
                            .setDescription(`Bạn chỉ có thể toggle role có quyền thấp hơn role staff của bạn!`)
                            .setTimestamp()
                            .setFooter({ 
                                text: 'Iris Market', 
                                iconURL: config.IMG 
                            });
                        
                        const reply = await message.reply({ embeds: [errorEmbed] });
                        setTimeout(async () => {
                            try {
                                await message.delete().catch(() => {});
                                await reply.delete().catch(() => {});
                            } catch (error) {}
                        }, 5000);
                        return;
                    }
                }
            }

            // Kiểm tra user đã có role chưa để quyết định thêm hay xóa
            const hasRole = targetUser.roles.cache.has(role.id);
            
            if (hasRole) {
                // Xóa role nếu user đã có
                await targetUser.roles.remove(role);
                
                // Tạo embed thành công (xóa role)
                const embed = new EmbedBuilder()
                    .setColor(config.COLORS.SUCCESS)
                    .setTitle('✅ Role Removed')
                    .setDescription(`Đã xóa role ${role} khỏi ${targetUser}`)
                    .setTimestamp()
                    .setFooter({ 
                        text: 'Iris Market',
                        iconURL: config.IMG
                    });
                
                const reply = await message.reply({ embeds: [embed] });
                
                // Xóa tin nhắn lệnh và tin nhắn phản hồi sau 5 giây
                setTimeout(async () => {
                    try {
                        await message.delete().catch(() => {});
                        await reply.delete().catch(() => {});
                    } catch (error) {}
                }, 5000);
            } else {
                // Thêm role nếu user chưa có
                await targetUser.roles.add(role);
                
                // Tạo embed thành công (thêm role)
                const embed = new EmbedBuilder()
                    .setColor(config.COLORS.SUCCESS)
                    .setTitle('✅ Role Added')
                    .setDescription(`Đã thêm role ${role} cho ${targetUser}`)
                    .setTimestamp()
                    .setFooter({ 
                        text: 'Iris Market',
                        iconURL: config.IMG
                    });
                
                const reply = await message.reply({ embeds: [embed] });
                
                // Xóa tin nhắn lệnh và tin nhắn phản hồi sau 5 giây
                setTimeout(async () => {
                    try {
                        await message.delete().catch(() => {});
                        await reply.delete().catch(() => {});
                    } catch (error) {}
                }, 5000);
            }


        } catch (error) {
            console.error('Error toggling role:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setColor(config.COLORS.ERROR)
                .setTitle('❌ Lỗi')
                .setDescription('Đã xảy ra lỗi khi thao tác với role!')
                .setTimestamp()
                .setFooter({ 
                    text: 'Iris Market', 
                    iconURL: config.IMG 
                });
            
            const reply = await message.reply({ embeds: [errorEmbed] });
            setTimeout(async () => {
                try {
                    await message.delete().catch(() => {});
                    await reply.delete().catch(() => {});
                } catch (error) {}
            }, 5000);
        }
    },
};

