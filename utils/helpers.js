const config = require('../config.json');

function isOwner(userId) {
    return userId === config.OWNER_ID;
}

function generateId(prefix = 'ID') {
    return prefix + Date.now().toString().slice(-6);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('vi-VN');
}

function formatTime(dateString) {
    return new Date(dateString).toLocaleString('vi-VN');
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function getRandomColor() {
    const colors = Object.values(config.COLORS);
    return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Kiểm tra xem user có role staff không
 * @param {GuildMember} member - Discord GuildMember object
 * @returns {boolean} - true nếu user có staff role hoặc là owner
 */
function hasStaffRole(member) {
    if (!member) return false;
    
    // Owner luôn có quyền
    if (member.id === config.OWNER_ID) return true;
    
    // Kiểm tra staff roles
    const staffRoles = config.STAFF_ROLES || [];
    if (staffRoles.length === 0) return false;
    
    // Kiểm tra xem member có role nào trong danh sách staff roles không
    return member.roles.cache.some(role => staffRoles.includes(role.id));
}

module.exports = {
    isOwner,
    generateId,
    formatDate,
    formatTime,
    capitalizeFirst,
    getRandomColor,
    hasStaffRole
};