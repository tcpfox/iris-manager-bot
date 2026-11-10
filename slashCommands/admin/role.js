const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { hasStaffRole } = require('../../utils/helpers');
const config = require('../../config.json');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('role')
        .setDescription('Toggle a role for a user (add if missing, remove if present)')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to toggle role for')
                .setRequired(true))
        .addRoleOption(option =>
            option.setName('role')
                .setDescription('Role to toggle')
                .setRequired(true)),
    
    async execute(interaction) {
        try {
            // Kiểm tra quyền: owner hoặc staff
            const member = await interaction.guild.members.fetch(interaction.user.id);
            if (!hasStaffRole(member)) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(config.COLORS.ERROR)
                            .setTitle('❌ Không có quyền')
                            .setDescription('Bạn không có quyền sử dụng lệnh này!')
                            .setTimestamp()
                            .setFooter({ 
                                text: 'Iris Market', 
                                iconURL: config.IMG 
                            })
                    ],
                    ephemeral: true
                });
            }

            const targetUser = interaction.options.getMember('user');
            const role = interaction.options.getRole('role');

            if (!targetUser) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(config.COLORS.ERROR)
                            .setTitle('❌ Lỗi')
                            .setDescription('Không tìm thấy user!')
                            .setTimestamp()
                            .setFooter({ 
                                text: 'Iris Market', 
                                iconURL: config.IMG 
                            })
                    ],
                    ephemeral: true
                });
            }

            // Kiểm tra bot có quyền quản lý role không
            if (role.position >= interaction.guild.members.me.roles.highest.position) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor(config.COLORS.ERROR)
                            .setTitle('❌ Không có quyền')
                            .setDescription('Bot không có quyền quản lý role này!')
                            .setTimestamp()
                            .setFooter({ 
                                text: 'Iris Market', 
                                iconURL: config.IMG 
                            })
                    ],
                    ephemeral: true
                });
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
                        return interaction.reply({
                            embeds: [
                                new EmbedBuilder()
                                    .setColor(config.COLORS.ERROR)
                                    .setTitle('❌ Không có quyền')
                                    .setDescription(`Bạn chỉ có thể toggle role có quyền thấp hơn role staff của bạn!`)
                                    .setTimestamp()
                                    .setFooter({ 
                                        text: 'Iris Market', 
                                        iconURL: config.IMG 
                                    })
                            ],
                            ephemeral: true
                        });
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
                
                await interaction.reply({ embeds: [embed] });
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
                
                await interaction.reply({ embeds: [embed] });
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
            
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed] });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    },
};

