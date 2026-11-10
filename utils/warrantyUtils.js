const fs = require('fs').promises;
const path = require('path');
const { EmbedBuilder } = require('discord.js');

const DB_PATH = path.join(__dirname, '../database/orders.json');
const config = require('../config.json');

/**
 * Đọc dữ liệu orders từ file
 */
async function readOrdersData() {
    try {
        const data = await fs.readFile(DB_PATH, 'utf8');
        const ordersData = JSON.parse(data);
        
        // Tự động thêm field hasWarranty cho các đơn hàng cũ (mặc định true)
        let updated = false;
        for (const order of ordersData.orders) {
            if (order.hasWarranty === undefined) {
                order.hasWarranty = true; // Mặc định có bảo hành cho đơn hàng cũ
                updated = true;
            }
        }
        
        if (updated) {
            await writeOrdersData(ordersData);
        }
        
        return ordersData;
    } catch (error) {
        return { orders: [] };
    }
}

/**
 * Ghi dữ liệu orders vào file
 */
async function writeOrdersData(ordersData) {
    await fs.writeFile(DB_PATH, JSON.stringify(ordersData, null, 4));
}

/**
 * Đánh dấu user đã rời server
 */
async function markUserLeftServer(userId, leftDate) {
    const ordersData = await readOrdersData();
    let updated = 0;

    for (const order of ordersData.orders) {
        if (order.userId === userId) {
            const purchaseDate = new Date(order.purchaseDate);
            const leftDateObj = new Date(leftDate);

            // Nếu đơn hàng mua trước khi rời server
            if (purchaseDate < leftDateObj) {
                order.leftServer = true;
                order.leftDate = leftDate;
                // Chỉ set warrantyEligible = false nếu đơn hàng có bảo hành
                if (order.hasWarranty !== false) {
                    order.warrantyEligible = false;
                }
                updated++;
            }
        }
    }

    if (updated > 0) {
        await writeOrdersData(ordersData);
        console.log(`✅ Đã cập nhật ${updated} đơn hàng của user ${userId} - không bảo hành do rời server`);
    }

    return updated;
}

/**
 * Đánh dấu đơn hàng đã feedback
 * @param {string} orderId - ID đơn hàng
 * @param {string} feedbackDate - Ngày feedback (ISO string)
 * @param {string} userId - ID người dùng feedback
 * @param {string|null} vouchImage - Link CDN ảnh vouch từ catbox.moe (nếu có)
 */
async function markOrderFeedback(orderId, feedbackDate, userId, vouchImage = null) {
    const ordersData = await readOrdersData();
    const order = ordersData.orders.find(o => o.orderId === orderId);

    if (!order) {
        return null;
    }

    // Kiểm tra xem order có thuộc về user này không
    if (order.userId !== userId) {
        return null;
    }

    // Đánh dấu đã feedback (feedback luôn bắt buộc dù có bảo hành hay không)
    order.hasFeedback = true;
    order.feedbackDate = feedbackDate;
    
    // Lưu link ảnh vouch nếu có
    if (vouchImage) {
        order.vouchImage = vouchImage;
    }

    // Chỉ cập nhật warrantyEligible nếu đơn hàng có bảo hành (hasWarranty !== false)
    if (order.hasWarranty !== false) {
        // Kiểm tra xem user có rời server không
        const purchaseDate = new Date(order.purchaseDate);
        const feedbackDateObj = new Date(feedbackDate);
        const hoursDiff = (feedbackDateObj - purchaseDate) / (1000 * 60 * 60);
        const deadlineHours = config.WARRANTY?.FEEDBACK_DEADLINE_HOURS || 24;

        // Nếu feedback trong deadline (giờ) và user chưa rời server
        if (hoursDiff <= deadlineHours && !order.leftServer) {
            order.warrantyEligible = true;
        } else {
            order.warrantyEligible = false;
        }
    } else {
        // Nếu đơn hàng không có bảo hành, warrantyEligible luôn là false
        order.warrantyEligible = false;
    }

    await writeOrdersData(ordersData);
    return order;
}

/**
 * Tìm đơn hàng theo order name và userId
 */
async function findOrderByOrderName(userId, orderName) {
    const ordersData = await readOrdersData();
    
    // Tìm đơn hàng chưa feedback của user này, có orderName tương tự
    const orders = ordersData.orders.filter(order => 
        order.userId === userId && 
        !order.hasFeedback &&
        order.orderName.toLowerCase().includes(orderName.toLowerCase())
    );

    // Trả về đơn hàng mới nhất
    if (orders.length > 0) {
        return orders.sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate))[0];
    }

    return null;
}

/**
 * Tìm đơn hàng theo userId và seller (addedBy)
 * Không cần kiểm tra tên đơn hàng - chỉ cần user và seller khớp
 * Trả về đơn hàng mới nhất chưa feedback
 */
async function findOrderByOrderNameAndSeller(userId, orderName, sellerId) {
    const ordersData = await readOrdersData();
    
    // Tìm đơn hàng chưa feedback của user này, và seller (addedBy) phải khớp
    // Không cần kiểm tra tên đơn hàng
    const orders = ordersData.orders.filter(order => 
        order.userId === userId && 
        !order.hasFeedback &&
        order.addedBy === sellerId // Người bán phải khớp với user được tag
    );

    // Trả về đơn hàng mới nhất
    if (orders.length > 0) {
        return orders.sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate))[0];
    }

    return null;
}

/**
 * Kiểm tra và cập nhật trạng thái bảo hành cho tất cả đơn hàng
 */
async function checkWarrantyEligibility() {
    const ordersData = await readOrdersData();
    const now = new Date();
    const deadlineHours = config.WARRANTY?.FEEDBACK_DEADLINE_HOURS || 24;
    let updated = 0;

    for (const order of ordersData.orders) {
        // Bỏ qua nếu đã feedback hoặc đã rời server
        if (order.hasFeedback || order.leftServer) {
            continue;
        }

        // Bỏ qua nếu đơn hàng không có bảo hành (hasWarranty = false)
        if (order.hasWarranty === false) {
            continue;
        }

        const purchaseDate = new Date(order.purchaseDate);
        const hoursDiff = (now - purchaseDate) / (1000 * 60 * 60);

        // Nếu quá deadline và chưa feedback
        if (hoursDiff > deadlineHours) {
            order.warrantyEligible = false;
            updated++;
        }
    }

    if (updated > 0) {
        await writeOrdersData(ordersData);
        console.log(`✅ Auto-check: Đã cập nhật ${updated} đơn hàng - không bảo hành do quá deadline`);
    }

    return updated;
}

/**
 * Lấy trạng thái bảo hành của đơn hàng
 */
async function getOrderWarrantyStatus(orderId) {
    const ordersData = await readOrdersData();
    const order = ordersData.orders.find(o => o.orderId === orderId);

    if (!order) {
        return null;
    }

    const purchaseDate = new Date(order.purchaseDate);
    const now = new Date();
    const hoursDiff = (now - purchaseDate) / (1000 * 60 * 60);
    const deadlineHours = config.WARRANTY?.FEEDBACK_DEADLINE_HOURS || 24;
    const timeRemaining = deadlineHours - hoursDiff;

    // Nếu đơn hàng không có bảo hành (hasWarranty = false), warrantyEligible luôn là false
    const hasWarranty = order.hasWarranty !== false;
    let warrantyEligible = false;
    if (hasWarranty) {
        warrantyEligible = order.warrantyEligible !== false;
    }

    return {
        order,
        hasWarranty: hasWarranty,
        warrantyEligible: warrantyEligible,
        hasFeedback: order.hasFeedback || false,
        feedbackDate: order.feedbackDate || null,
        leftServer: order.leftServer || false,
        leftDate: order.leftDate || null,
        hoursRemaining: timeRemaining > 0 ? Math.ceil(timeRemaining) : 0,
        isOverdue: hoursDiff > deadlineHours && !order.hasFeedback
    };
}

/**
 * Tạo embed thông báo feedback cho admin/khách/ticket
 */
function createFeedbackNotificationEmbed(order, feedbackUser) {
    const hasWarranty = order.hasWarranty !== false;
    const warrantyText = hasWarranty 
        ? '🛡️ **Đơn hàng đã có bảo hành**'
        : '⚠️ **Mặt hàng không nhận bảo hành**';
    
    const embed = new EmbedBuilder()
        .setTitle('✅ Khách Hàng Đã Feedback')
        .setDescription([
            `**Mã Đơn:** \`${order.orderId}\``,
            `**Khách Hàng:** <@${order.userId}> (${order.username})`,
            `**Tên Đơn Hàng:** ${order.orderName}`,
            `**Giá Tiền:** ${order.price ? order.price.toLocaleString('vi-VN') + 'đ' : 'N/A'}`,
            '',
            warrantyText,
            '📝 **Có thể đóng ticket**'
        ].join('\n'))
        .setColor(hasWarranty ? '#00ff00' : '#ffaa00')
        .setThumbnail(feedbackUser.displayAvatarURL({ dynamic: true }))
        .setTimestamp()
        .setFooter({ text: 'Iris Market • Hệ thống bảo hành', iconURL: config.IMG });

    return embed;
}

module.exports = {
    markUserLeftServer,
    markOrderFeedback,
    findOrderByOrderName,
    findOrderByOrderNameAndSeller,
    checkWarrantyEligibility,
    getOrderWarrantyStatus,
    createFeedbackNotificationEmbed,
    readOrdersData,
    writeOrdersData
};

