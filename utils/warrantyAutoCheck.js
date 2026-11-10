const warrantyUtils = require('./warrantyUtils');

let checkInterval = null;

/**
 * Khởi động hệ thống auto-check định kỳ
 */
function startAutoCheck(client) {
    const config = client.config;
    const intervalMinutes = config.WARRANTY?.AUTO_CHECK_INTERVAL_MINUTES || 60;
    const intervalMs = intervalMinutes * 60 * 1000;

    // Chạy check ngay lập tức khi khởi động
    console.log('🔄 Đang chạy auto-check bảo hành lần đầu...');
    warrantyUtils.checkWarrantyEligibility().then(updated => {
        if (updated > 0) {
            console.log(`✅ Auto-check: Đã cập nhật ${updated} đơn hàng`);
        } else {
            console.log('✅ Auto-check: Không có đơn hàng nào cần cập nhật');
        }
    });

    // Chạy định kỳ
    checkInterval = setInterval(async () => {
        console.log('🔄 Đang chạy auto-check bảo hành định kỳ...');
        const updated = await warrantyUtils.checkWarrantyEligibility();
        if (updated > 0) {
            console.log(`✅ Auto-check: Đã cập nhật ${updated} đơn hàng`);
        }
    }, intervalMs);

    console.log(`✅ Đã khởi động auto-check bảo hành (mỗi ${intervalMinutes} phút)`);
}

/**
 * Dừng hệ thống auto-check
 */
function stopAutoCheck() {
    if (checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
        console.log('⏹️ Đã dừng auto-check bảo hành');
    }
}

module.exports = {
    startAutoCheck,
    stopAutoCheck
};

