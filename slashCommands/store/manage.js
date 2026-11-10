const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const config = require('../../config.json');

const DB_PATH = {
    categories: path.join(__dirname, '../../database/categories.json'),
    decorations: path.join(__dirname, '../../database/decorations.json')
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('manage')
        .setDescription('Quản lý danh mục và decorations')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Loại quản lý')
                .setRequired(true)
                .addChoices(
                    { name: 'Categories', value: 'categories' },
                    { name: 'Decorations', value: 'decorations' }
                ))
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Hành động')
                .setRequired(true)
                .addChoices(
                    { name: 'Add', value: 'add' },
                    { name: 'Edit', value: 'edit' },
                    { name: 'Delete', value: 'delete' },
                    { name: 'List', value: 'list' }
                )),
    
    async execute(interaction) {
        try {
            const type = interaction.options.getString('type');
            const action = interaction.options.getString('action');
            
            await interaction.deferReply({ ephemeral: true });

            if (action === 'list') {
                await this.listItems(interaction, type);
            } else if (action === 'add') {
                await this.showAddModal(interaction, type);
            } else if (action === 'edit') {
                await this.showEditSelect(interaction, type);
            } else if (action === 'delete') {
                await this.showDeleteSelect(interaction, type);
            }
        } catch (error) {
            console.error('Error in manage command:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle('❌ Lỗi!')
                .setDescription('Đã xảy ra lỗi khi thực hiện lệnh.')
                .setColor('#ff0000')
                .setTimestamp();

            if (interaction.deferred) {
                await interaction.editReply({ embeds: [errorEmbed] });
            } else {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            }
        }
    },

    async listItems(interaction, type) {
        try {
            const data = JSON.parse(await fs.readFile(DB_PATH[type], 'utf8'));
            
            const embed = new EmbedBuilder()
                .setTitle(`📋 Danh sách ${type}`)
                .setColor('#0099ff')
                .setTimestamp();

            if (data.items.length === 0) {
                embed.setDescription('Chưa có dữ liệu nào.');
            } else {
                const itemsList = data.items.map((item, index) => {
                    if (type === 'products') {
                        return `${index + 1}. **${item.name}** - ${item.price.toLocaleString()}₫`;
                    } else if (type === 'categories') {
                        return `${index + 1}. **${item.name}** - ${item.description}`;
                    } else if (type === 'decorations') {
                        return `${index + 1}. **${item.name}** - ${item.prices.withNitro.avatar.toLocaleString()}₫ (Nitro) / ${item.prices.withoutNitro.avatar.toLocaleString()}₫`;
                    }
                }).join('\n');

                embed.setDescription(itemsList);
            }

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error listing items:', error);
            await interaction.editReply({ content: '❌ Lỗi khi đọc dữ liệu!' });
        }
    },

    async showAddModal(interaction, type) {
        const modal = new ModalBuilder()
            .setCustomId(`add_${type}`)
            .setTitle(`Thêm ${type.slice(0, -1)}`);

        if (type === 'products') {
            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('name')
                        .setLabel('Tên sản phẩm')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('description')
                        .setLabel('Mô tả')
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('price')
                        .setLabel('Giá (VND)')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('categoryId')
                        .setLabel('ID Danh mục')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                )
            );
        } else if (type === 'categories') {
            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('name')
                        .setLabel('Tên danh mục')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('description')
                        .setLabel('Mô tả')
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('icon')
                        .setLabel('Icon ID')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(false)
                )
            );
        } else if (type === 'decorations') {
            modal.addComponents(
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('name')
                        .setLabel('Tên decoration')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('description')
                        .setLabel('Mô tả')
                        .setStyle(TextInputStyle.Paragraph)
                        .setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('price_with_nitro')
                        .setLabel('Giá có Nitro (VND)')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('price_without_nitro')
                        .setLabel('Giá không Nitro (VND)')
                        .setStyle(TextInputStyle.Short)
                        .setRequired(true)
                )
            );
        }

        await interaction.showModal(modal);
    },

    async showEditSelect(interaction, type) {
        try {
            const data = JSON.parse(await fs.readFile(DB_PATH[type], 'utf8'));
            
            if (data.items.length === 0) {
                return await interaction.editReply({ content: 'Không có dữ liệu để chỉnh sửa!' });
            }

            const options = data.items.map(item => ({
                label: item.name,
                value: item.id,
                description: type === 'products' ? `${item.price.toLocaleString()}₫` : 
                           type === 'decorations' ? `${item.prices.withNitro.avatar.toLocaleString()}₫` : 
                           item.description?.substring(0, 100)
            }));

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`edit_${type}`)
                .setPlaceholder(`Chọn ${type.slice(0, -1)} để chỉnh sửa...`)
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.editReply({
                content: `Chọn ${type.slice(0, -1)} để chỉnh sửa:`,
                components: [row]
            });
        } catch (error) {
            console.error('Error showing edit select:', error);
            await interaction.editReply({ content: '❌ Lỗi khi tải dữ liệu!' });
        }
    },

    async showDeleteSelect(interaction, type) {
        try {
            const data = JSON.parse(await fs.readFile(DB_PATH[type], 'utf8'));
            
            if (data.items.length === 0) {
                return await interaction.editReply({ content: 'Không có dữ liệu để xóa!' });
            }

            const options = data.items.map(item => ({
                label: item.name,
                value: item.id,
                description: type === 'products' ? `${item.price.toLocaleString()}₫` : 
                           type === 'decorations' ? `${item.prices.withNitro.avatar.toLocaleString()}₫` : 
                           item.description?.substring(0, 100)
            }));

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`delete_${type}`)
                .setPlaceholder(`Chọn ${type.slice(0, -1)} để xóa...`)
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.editReply({
                content: `Chọn ${type.slice(0, -1)} để xóa:`,
                components: [row]
            });
        } catch (error) {
            console.error('Error showing delete select:', error);
            await interaction.editReply({ content: '❌ Lỗi khi tải dữ liệu!' });
        }
    }
};

