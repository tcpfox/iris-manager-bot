const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs').promises;
const path = require('path');
const config = require('./config.json');

// Import catbox upload function từ parent folder
const { uploadAttachmentToCatbox, uploadUrlToCatbox } = require('../utils/catbox');

// Đường dẫn file orders.json trong folder tool
const ORDERS_PATH = path.join(__dirname, 'orders.json');

// Khởi tạo Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

/**
 * Parse message để lấy order name
 * Format: "+1 legit @username order name"
 * @username là người được feedback (người trả đơn), không phải người thực hiện feedback
 * Hàm này chỉ cần trích xuất order name, username và userId sẽ lấy từ message.author
 */
function parseFeedbackMessage(message) {
    const content = message.content.trim();
    
    // Kiểm tra xem có bắt đầu bằng "+1 legit" không
    if (!content.toLowerCase().startsWith('+1 legit')) {
        return null;
    }

    // Loại bỏ "+1 legit" khỏi nội dung
    let remaining = content.substring(8).trim();
    
    let orderName = null;

    // Loại bỏ mention (người được feedback) khỏi nội dung để lấy order name
    // Ưu tiên: Kiểm tra xem có mention được resolve không
    const mention = message.mentions.users.first();
    if (mention) {
        // Mention đã được resolve thành công, loại bỏ mention pattern
        remaining = remaining.replace(/<@!?\d+>/g, '').trim();
    } else {
        // Mention không được resolve (ví dụ: @người-dùng-không-xác-định)
        // Tìm mention pattern trong content (<@userId>)
        const mentionPattern = /<@!?(\d+)>/;
        const mentionMatch = remaining.match(mentionPattern);
        
        if (mentionMatch) {
            // Có mention pattern, loại bỏ nó
            remaining = remaining.replace(mentionPattern, '').trim();
        } else {
            // Không có mention pattern, tìm @username trong text (ví dụ: @người-dùng-không-xác-định)
            const textMentionMatch = remaining.match(/^@(\S+)/);
            if (textMentionMatch) {
                // Loại bỏ @username khỏi content
                remaining = remaining.substring(textMentionMatch[0].length).trim();
            } else {
                // Không có mention nào, có thể feedback không đúng định dạng
                // Thử lấy từ đầu tiên làm username (để loại bỏ), phần còn lại là order name
                const parts = remaining.split(/\s+/);
                if (parts.length > 1) {
                    // Bỏ qua từ đầu tiên (có thể là username không có @)
                    remaining = parts.slice(1).join(' ').trim();
                }
            }
        }
    }

    // Phần còn lại là order name
    orderName = remaining.trim();

    // Nếu không có order name, bỏ qua (feedback không đúng định dạng)
    if (!orderName || orderName.length === 0) {
        return null;
    }

    // Chỉ trả về orderName, username và userId sẽ lấy từ message.author
    return {
        orderName
    };
}

/**
 * Tạo order ID duy nhất
 */
function generateOrderId(timestamp) {
    const time = timestamp || Date.now();
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    return `ORD${time}${random}`;
}

/**
 * Thu thập tất cả messages từ kênh feedback
 */
async function collectFeedbackMessages(channelId) {
    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel || !channel.isTextBased()) {
            throw new Error('Kênh không hợp lệ hoặc không phải kênh text');
        }

        console.log(`📥 Đang thu thập messages từ kênh: ${channel.name}...`);
        
        // Fetch tất cả members trong guild để hỗ trợ tìm kiếm username
        if (channel.guild) {
            console.log('👥 Đang tải danh sách members...');
            await channel.guild.members.fetch();
            console.log(`✅ Đã tải ${channel.guild.members.cache.size} members\n`);
        }
        
        const orders = [];
        let lastMessageId = null;
        let messageCount = 0;
        let processedCount = 0;
        let imageUploadCount = 0;

        // Thu thập tất cả messages (pagination)
        while (true) {
            const options = { limit: 100 };
            if (lastMessageId) {
                options.before = lastMessageId;
            }

            const messages = await channel.messages.fetch(options);
            
            if (messages.size === 0) {
                break;
            }

            messageCount += messages.size;
            console.log(`📊 Đã tải ${messageCount} messages...`);

            // Xử lý từng message
            for (const message of messages.values()) {
                // Bỏ qua tin nhắn từ bot
                if (message.author.bot) continue;

                // Kiểm tra xem có phải feedback message không
                if (!message.content.toLowerCase().includes('+1 legit')) {
                    continue;
                }

                // Parse message để lấy order name (username được tag chỉ là người được feedback, không phải người thực hiện feedback)
                const parsed = parseFeedbackMessage(message);
                if (parsed) {
                    const timestamp = message.createdAt.getTime();
                    
                    // Kiểm tra và upload ảnh vouch nếu có
                    let vouchImageLink = null;
                    
                    // Ưu tiên: Kiểm tra attachment trực tiếp
                    if (message.attachments && message.attachments.size > 0) {
                        const firstAttachment = message.attachments.first();
                        if (firstAttachment && firstAttachment.contentType && firstAttachment.contentType.startsWith('image/')) {
                            try {
                                console.log(`   📸 Đang upload ảnh từ attachment cho ${message.author.username}...`);
                                vouchImageLink = await uploadAttachmentToCatbox(firstAttachment);
                                if (vouchImageLink) {
                                    console.log(`   ✅ Đã upload ảnh: ${vouchImageLink}`);
                                } else {
                                    console.log(`   ⚠️ Không thể upload ảnh từ attachment`);
                                }
                            } catch (error) {
                                console.log(`   ❌ Lỗi khi upload ảnh từ attachment: ${error.message}`);
                            }
                        }
                    }
                    
                    // Nếu không có attachment, kiểm tra URL ảnh trong message content
                    // Discord CDN URLs: cdn.discordapp.com, media.discordapp.net
                    if (!vouchImageLink) {
                        // Pattern 1: URL có extension ảnh rõ ràng
                        const urlPattern1 = /https?:\/\/[^\s]+\.(jpg|jpeg|png|gif|webp|bmp)(\?[^\s]*)?/gi;
                        // Pattern 2: Discord CDN URLs (có thể không có extension nhưng là ảnh)
                        const urlPattern2 = /https?:\/\/(cdn|media)\.discordapp\.(com|net)\/[^\s]+/gi;
                        
                        const imageUrls = [
                            ...(message.content.match(urlPattern1) || []),
                            ...(message.content.match(urlPattern2) || [])
                        ];
                        
                        if (imageUrls.length > 0) {
                            // Thử upload URL ảnh đầu tiên
                            try {
                                const imageUrl = imageUrls[0].split(/\s/)[0]; // Lấy phần đầu trước space
                                console.log(`   📸 Đang upload ảnh từ URL cho ${message.author.username}...`);
                                vouchImageLink = await uploadUrlToCatbox(imageUrl);
                                if (vouchImageLink) {
                                    console.log(`   ✅ Đã upload ảnh từ URL: ${vouchImageLink}`);
                                } else {
                                    console.log(`   ⚠️ Không thể upload ảnh từ URL`);
                                }
                            } catch (error) {
                                console.log(`   ❌ Lỗi khi upload ảnh từ URL: ${error.message}`);
                            }
                        }
                    }
                    
                    const order = {
                        orderId: generateOrderId(timestamp),
                        userId: message.author.id, // userId của người thực hiện feedback
                        username: message.author.username, // username của người thực hiện feedback
                        orderName: parsed.orderName,
                        price: null, // Không có thông tin giá từ dữ liệu cũ
                        purchaseDate: message.createdAt.toISOString(),
                        addedBy: message.author.id,
                        addedAt: message.createdAt.toISOString(),
                        hasFeedback: true,
                        feedbackDate: message.createdAt.toISOString(),
                        hasWarranty: true,
                        warrantyEligible: true,
                        leftServer: false,
                        channelId: null // Không có thông tin channel từ feedback message cũ
                    };
                    
                    // Thêm vouchImage nếu có
                    if (vouchImageLink) {
                        order.vouchImage = vouchImageLink;
                        imageUploadCount++;
                    }
                    
                    orders.push(order);
                    processedCount++;
                    
                    const imageInfo = vouchImageLink ? ' 📸' : '';
                    console.log(`✅ [${processedCount}] ${message.author.username} (${message.author.id}) - ${parsed.orderName}${imageInfo}`);
                } else {
                    // Log để debug nếu có message +1 legit nhưng không parse được
                    if (message.content.toLowerCase().includes('+1 legit')) {
                        console.log(`⚠️ Không parse được: ${message.content.substring(0, 100)}`);
                    }
                }
            }

            // Lấy ID của message cuối cùng để tiếp tục pagination
            lastMessageId = messages.last()?.id;
            
            // Nếu không còn message nào, dừng
            if (messages.size < 100) {
                break;
            }
        }

        console.log(`\n📊 Tổng kết:`);
        console.log(`   - Tổng số messages: ${messageCount}`);
        console.log(`   - Số orders đã tìm thấy: ${processedCount}`);
        console.log(`   - Số ảnh vouch đã upload: ${imageUploadCount}`);

        // Sắp xếp orders theo thời gian: cũ nhất trước, mới nhất sau
        orders.sort((a, b) => {
            const dateA = new Date(a.purchaseDate);
            const dateB = new Date(b.purchaseDate);
            return dateA - dateB; // Tăng dần (cũ -> mới)
        });

        console.log(`   - Đã sắp xếp: feedback cũ nhất ở đầu, mới nhất ở cuối`);

        return orders;
    } catch (error) {
        console.error('❌ Lỗi khi thu thập messages:', error);
        throw error;
    }
}

/**
 * Lưu orders vào file JSON
 */
async function saveOrders(orders) {
    try {
        const data = {
            orders: orders
        };
        
        await fs.writeFile(ORDERS_PATH, JSON.stringify(data, null, 4), 'utf8');
        console.log(`\n✅ Đã lưu ${orders.length} orders vào ${ORDERS_PATH}`);
    } catch (error) {
        console.error('❌ Lỗi khi lưu file:', error);
        throw error;
    }
}

/**
 * Hàm chính
 */
async function main() {
    try {
        console.log('🚀 Đang khởi động tool thu thập feedback...\n');

        // Đăng nhập vào Discord
        await client.login(config.TOKEN);
        console.log(`✅ Đã đăng nhập: ${client.user.tag}\n`);

        // Lấy channel ID từ config hoặc có thể truyền vào
        const channelId = config.FEEDBACK_CHANNEL;
        if (!channelId) {
            throw new Error('Không tìm thấy FEEDBACK_CHANNEL trong config.json');
        }

        console.log(`📌 Channel ID: ${channelId}\n`);

        // Thu thập messages
        const orders = await collectFeedbackMessages(channelId);

        // Lưu vào file
        if (orders.length > 0) {
            await saveOrders(orders);
        } else {
            console.log('\n⚠️ Không tìm thấy orders nào!');
        }

        console.log('\n✅ Hoàn thành!');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Lỗi:', error);
        process.exit(1);
    }
}

// Chạy tool
main();

