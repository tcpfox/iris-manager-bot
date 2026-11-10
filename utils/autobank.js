const { EmbedBuilder } = require('discord.js');
const { google } = require('googleapis');
const path = require('path');
const config = require('../config.json');

let pendingPayments = new Map();
let isInitialized = false;
let sheets = null;
const AUTOBANK_DEBUG = false;

// Khởi tạo Google Sheets API
async function initGoogleSheets() {
    try {
        console.log('🔄 Đang khởi tạo Google Sheets API...');
        const keyFilePath = path.join(__dirname, '../authentication/secure-bongo-424420-b0-3cc0b2e745d4.json');
        console.log('📁 Đường dẫn file key:', keyFilePath);

        const auth = new google.auth.GoogleAuth({
            keyFile: keyFilePath,
            scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
        });
        const googleClient = await auth.getClient();
        sheets = google.sheets({ version: 'v4', auth: googleClient });
        isInitialized = true;
        console.log('✅ Google Sheets API đã khởi tạo thành công');
    } catch (error) {
        console.error('❌ Lỗi khởi tạo Google Sheets API:', error.message);
        console.error('📋 Chi tiết lỗi:', error);
        isInitialized = false;
    }
}

// Bắt đầu kiểm tra giao dịch
function startTransactionCheck(client) {
    if (!isInitialized) {
        console.log('⚠️ Google Sheets chưa được khởi tạo');
        return;
    }

    const spreadsheetId = '11wSjx8qEe6W47RAoaTO_EGuP6sbqolk0JtEoI98Wf-I';

    // Kiểm tra giao dịch mỗi 10 giây
    setInterval(async () => {
        try {
            const currentTime = Date.now();

            console.log('📊 Đang đọc dữ liệu từ Google Sheets...');
            // Lấy dữ liệu từ Google Sheets
            const response = await sheets.spreadsheets.values.get({
                spreadsheetId: spreadsheetId,
                range: 'Trang tính1!A2:L', // Lấy toàn bộ dữ liệu
            });

            const rows = response.data.values || [];
            console.log(`📋 Đọc được ${rows.length} dòng dữ liệu từ Google Sheets`);

            if (rows.length === 0) {
                console.log('⚠️ Không có dữ liệu giao dịch trong Google Sheets.');
                return;
            }

            // Chuyển đổi dữ liệu thành định dạng giao dịch đơn giản hơn
            const transactions = rows.map(row => {
                // Chỉ lấy những cột cần thiết cho định dạng mới
                return {
                    transactionDate: row[1] || '',    // Thời gian TT (Cột B, index 1)
                    amount: parseFloat(row[7] || '0'), // Số tiền (Cột H, index 7)
                    transactionId: row[8] || '',      // Mã giao dịch (Cột I, index 8)
                    content: row[5] || '',            // Nội dung (Cột F, index 5)
                    status: (row[6] === 'Tiền vào') ? 'Thành công' : (row[6] || '') // Trạng thái 'Tiền vào' đổi thành 'Thành công'
                };
            });

            // Lọc các giao dịch thành công
            const validTransactions = transactions.filter(tx =>
                tx.status.includes('Thành công') &&
                tx.amount > 0 &&
                tx.transactionDate // Đảm bảo có ngày giao dịch
            );

            console.log(`✅ Tìm thấy ${validTransactions.length} giao dịch thành công`);

            // Filter for recent transactions (within the last 15 minutes) to match QR code expiry
            const newTransactions = validTransactions.filter(tx => {
                if (!tx.transactionDate) {
                    console.log(`⚠️ Giao dịch không có ngày: ${tx.amount}đ - ${tx.content}`);
                    return false;
                }

                // Parse "DD/MM/YYYY HH:MM" or "YYYY-MM-DD HH:MM:SS" into a Date object
                const parts = tx.transactionDate.split(/[-/ :]/);
                if (parts.length < 5) {
                    console.log(`⚠️ Format ngày không đúng: ${tx.transactionDate}`);
                    return false;
                }

                let year, month, day;
                if (parts[0].length === 4) {
                    // YYYY-MM-DD format
                    year = parseInt(parts[0]);
                    month = parseInt(parts[1]) - 1;
                    day = parseInt(parts[2]);
                } else {
                    // DD/MM/YYYY format
                    year = parseInt(parts[2]);
                    month = parseInt(parts[1]) - 1;
                    day = parseInt(parts[0]);
                }

                const hour = parseInt(parts[3]);
                const minute = parseInt(parts[4]);
                const second = parts.length >= 6 ? parseInt(parts[5]) : 0; // Default seconds to 0 if not present

                const txDate = new Date(year, month, day, hour, minute, second);

                // Check if the transaction is within the last 15 minutes
                const fifteenMinutesAgo = Date.now() - (15 * 60 * 1000);
                const isRecent = txDate.getTime() > fifteenMinutesAgo;

                if (AUTOBANK_DEBUG) console.log(`🔍 Kiểm tra giao dịch: ${tx.amount}đ - "${tx.content}" - ${tx.transactionDate} - ${isRecent ? 'Gần đây' : 'Cũ'}`);
                return isRecent;
            });

            // Log thông tin debug
            if (AUTOBANK_DEBUG) console.log(`🔍 Đang kiểm tra ${pendingPayments.size} thanh toán chờ...`);
            if (AUTOBANK_DEBUG) console.log(`📊 Tìm thấy ${newTransactions.length} giao dịch mới`);

            // Log chi tiết các giao dịch mới
            if (AUTOBANK_DEBUG) {
                if (newTransactions.length > 0) {
                    console.log(`🆕 Tìm thấy ${newTransactions.length} giao dịch mới:`);
                    newTransactions.forEach((tx, index) => {
                        console.log(`📋 Giao dịch ${index + 1}:`, {
                            amount: tx.amount,
                            content: tx.content,
                            date: tx.transactionDate,
                            status: tx.status
                        });
                    });
                } else {
                    console.log(`⚠️ Không có giao dịch mới nào`);
                }
            }

            // Kiểm tra mỗi khoản thanh toán đang chờ
            for (const [key, payment] of pendingPayments) {
                const { amount, description, interaction, userId, username, createdAt } = payment;

                if (AUTOBANK_DEBUG) console.log(`🔍 Kiểm tra thanh toán: ${username} - ${amount}đ - "${description}"`);

                // Kiểm tra xem thanh toán đã hết hạn chưa (15 phút)
                if (currentTime - createdAt > 15 * 60 * 1000) {
                    try {
                        const expiredEmbed = new EmbedBuilder()
                            .setColor('#ff0000')
                            .setTitle('❌ Mã QR đã hết hạn!')
                            .setDescription('Vui lòng tạo mã QR mới để tiếp tục thanh toán.')
                            .setTimestamp()
                            .setFooter({
                                text: 'Iris Market',
                                iconURL: config.IMG
                            });

                        // Gửi DM cho user thay vì dùng interaction (vì token đã hết hạn)
                        const user = await client.users.fetch(userId);
                        if (user) {
                            await user.send({ embeds: [expiredEmbed] }).catch(() =>
                                console.log(`Không thể gửi DM cho người dùng ${username}`)
                            );
                        }
                    } catch (err) {
                        console.log('Lỗi khi gửi thông báo hết hạn:', err.message);
                    }
                    pendingPayments.delete(key);
                    continue;
                }

                // Find a matching transaction - requires exact match of amount and a sanitized description
                const matchingTx = newTransactions.find(tx => {
                    const txAmount = tx.amount;
                    // Sanitize by converting to lowercase and removing all non-alphanumeric characters
                    const sanitize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

                    const txDesc = sanitize(tx.content);
                    const expectedDesc = sanitize(description);

                    const amountMatch = txAmount === amount;
                    const descriptionMatch = txDesc.includes(expectedDesc);

                    if (AUTOBANK_DEBUG) {
                        console.log(`🔍 So sánh:`, {
                            txAmount,
                            expectedAmount: amount,
                            txDesc,
                            expectedDesc,
                            amountMatch,
                            descriptionMatch,
                            finalMatch: amountMatch && descriptionMatch
                        });
                    }

                    return amountMatch && descriptionMatch;
                });

                if (matchingTx) {
                    const successEmbed = new EmbedBuilder()
                        .setColor('#00ff00')
                        .setTitle('✅ Thanh toán thành công!')
                        .setDescription([
                            '```md',
                            '# Chi tiết giao dịch',
                            '```',
                            '**Giao dịch đã được xác nhận thành công!**\n'
                        ].join('\n'))
                        .addFields(
                            {
                                name: '💰 Thông tin thanh toán',
                                value: [
                                    `**Số tiền:** ${matchingTx.amount.toLocaleString()}đ`,
                                    `**Nội dung:** ${matchingTx.content}`,
                                    `**Thời gian:** ${matchingTx.transactionDate}`,
                                    `**Mã giao dịch:** ${matchingTx.transactionId}`
                                ].join('\n'),
                                inline: false
                            }
                        )
                        .setTimestamp()
                        .setFooter({
                            text: 'Iris Market • Cảm ơn bạn đã sử dụng dịch vụ',
                            iconURL: config.IMG
                        });

                    try {
                        // Edit the original invoice message to show success and remove the QR code
                        await interaction.editReply({ embeds: [successEmbed], files: [] });

                        // Thông báo cho người dùng trong DM nếu có thể
                        try {
                            const user = await client.users.fetch(userId);
                            if (user) {
                                const dmEmbed = new EmbedBuilder()
                                    .setColor('#00ff00')
                                    .setTitle('💵 Thanh toán của bạn đã được xác nhận!')
                                    .setDescription(`Chúng tôi đã nhận được thanh toán **${matchingTx.amount.toLocaleString()}đ** của bạn. Vui lòng chờ admin xử lý đơn hàng.`)
                                    .setTimestamp()
                                    .setFooter({
                                        text: 'Iris Market • Cảm ơn bạn đã tin tưởng',
                                        iconURL: config.IMG
                                    });

                                await user.send({ embeds: [dmEmbed] }).catch(() =>
                                    console.log(`Không thể gửi DM cho người dùng ${username}`)
                                );
                            }
                        } catch (dmError) {
                            console.log('Lỗi khi gửi DM:', dmError);
                        }
                    } catch (err) {
                        console.log('Lỗi khi gửi thông báo thành công:', err);
                    }

                    pendingPayments.delete(key);
                }
            }
        } catch (error) {
            console.error('Lỗi khi kiểm tra giao dịch:', error);
        }
    }, 10000); // Kiểm tra mỗi 10 giây
}

// Thêm thanh toán vào danh sách chờ
function addPendingPayment(paymentData) {
    const key = `${paymentData.userId}-${paymentData.amount}-${Date.now()}`;
    pendingPayments.set(key, {
        ...paymentData,
        createdAt: Date.now()
    });
    console.log(`Đã thêm thanh toán chờ: ${paymentData.username} - ${paymentData.amount}đ - "${paymentData.description}"`);
    return key;
}

module.exports = {
    initGoogleSheets,
    startTransactionCheck,
    addPendingPayment
};
