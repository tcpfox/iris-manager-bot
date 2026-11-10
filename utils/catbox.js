const FormData = require('form-data');
const axios = require('axios');
const { Readable } = require('stream');

const CATBOX_API = 'https://catbox.moe/user/api.php';

/**
 * Upload ảnh lên catbox.moe và trả về CDN link
 * @param {Buffer|Readable} fileBuffer - Buffer hoặc stream của file ảnh
 * @param {string} filename - Tên file (ví dụ: image.png)
 * @returns {Promise<string|null>} - CDN link hoặc null nếu lỗi
 */
async function uploadToCatbox(fileBuffer, filename, contentType = null) {
    try {
        const form = new FormData();
        
        // Theo API spec từ https://catbox.moe/sharexcode.txt:
        // Arguments - reqtype: "fileupload"
        form.append('reqtype', 'fileupload');
        
        // FileFormName: "fileToUpload"
        if (contentType) {
            form.append('fileToUpload', fileBuffer, {
                filename: filename,
                contentType: contentType
            });
        } else {
            form.append('fileToUpload', fileBuffer, filename);
        }

        // Sử dụng axios để gửi multipart form data (tương thích tốt hơn với form-data package)
        const response = await axios.post(CATBOX_API, form, {
            headers: {
                ...form.getHeaders()
            },
            timeout: 60000, // 60 giây timeout
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        const text = response.data;
        
        // Kiểm tra xem response có phải là URL hợp lệ không
        if (text && typeof text === 'string' && text.trim().startsWith('https://')) {
            return text.trim();
        } else {
            console.error(`❌ Catbox upload failed. Response: ${typeof text === 'string' ? text.substring(0, 200) : JSON.stringify(text)}`);
            return null;
        }
    } catch (error) {
        if (error.code === 'ECONNABORTED') {
            console.error('❌ Upload timeout sau 60 giây');
        } else if (error.response) {
            // Server trả về response với status code lỗi
            const errorText = typeof error.response.data === 'string' 
                ? error.response.data 
                : JSON.stringify(error.response.data);
            console.error(`❌ Catbox API error: ${error.response.status} ${error.response.statusText} - ${errorText.substring(0, 200)}`);
        } else {
            console.error('❌ Lỗi khi upload lên catbox.moe:', error.message || error);
            console.error('❌ Error details:', error);
        }
        return null;
    }
}

/**
 * Upload ảnh từ Discord attachment lên catbox.moe
 * @param {discord.Attachment} attachment - Discord attachment object
 * @returns {Promise<string|null>} - CDN link hoặc null nếu lỗi
 */
async function uploadAttachmentToCatbox(attachment) {
    try {
        // Kiểm tra xem có phải là ảnh không
        if (!attachment.contentType || !attachment.contentType.startsWith('image/')) {
            console.error('❌ File không phải là ảnh:', attachment.contentType);
            return null;
        }

        // Tải file từ Discord
        const response = await fetch(attachment.url, {
            signal: AbortSignal.timeout(30000) // 30 giây timeout
        });
        
        if (!response.ok) {
            console.error(`❌ Không thể tải ảnh từ Discord: ${response.status} ${response.statusText}`);
            return null;
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        
        // Upload lên catbox với contentType từ attachment
        const cdnLink = await uploadToCatbox(buffer, attachment.name, attachment.contentType);
        return cdnLink;
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('❌ Timeout khi tải ảnh từ Discord');
        } else {
            console.error('❌ Lỗi khi upload attachment lên catbox.moe:', error.message || error);
        }
        return null;
    }
}

/**
 * Upload ảnh từ URL lên catbox.moe
 * @param {string} imageUrl - URL của ảnh
 * @returns {Promise<string|null>} - CDN link hoặc null nếu lỗi
 */
async function uploadUrlToCatbox(imageUrl) {
    try {
        // Kiểm tra URL hợp lệ
        if (!imageUrl || typeof imageUrl !== 'string') {
            console.error('❌ URL không hợp lệ');
            return null;
        }

        // Kiểm tra URL có bắt đầu bằng http:// hoặc https:// không
        if (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
            console.error('❌ URL phải bắt đầu bằng http:// hoặc https://');
            return null;
        }

        // Tải ảnh từ URL
        const response = await fetch(imageUrl, {
            signal: AbortSignal.timeout(30000) // 30 giây timeout
        });

        if (!response.ok) {
            console.error(`❌ Không thể tải ảnh từ URL: ${response.status} ${response.statusText}`);
            return null;
        }

        // Kiểm tra content-type
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.startsWith('image/')) {
            console.error(`❌ URL không trỏ đến ảnh hợp lệ. Content-Type: ${contentType}`);
            return null;
        }

        // Lấy buffer từ response
        const buffer = Buffer.from(await response.arrayBuffer());
        
        // Tạo filename từ URL hoặc content-type
        const urlPath = new URL(imageUrl).pathname;
        let filename = urlPath.split('/').pop();
        
        // Nếu không có extension, thêm extension từ content-type
        if (!filename || !filename.includes('.')) {
            const ext = contentType.split('/')[1]?.split(';')[0] || 'png';
            filename = `image.${ext}`;
        }

        // Upload lên catbox với contentType từ response
        const cdnLink = await uploadToCatbox(buffer, filename, contentType);
        return cdnLink;
    } catch (error) {
        if (error.name === 'AbortError') {
            console.error('❌ Timeout khi tải ảnh từ URL');
        } else {
            console.error('❌ Lỗi khi upload URL lên catbox.moe:', error.message || error);
        }
        return null;
    }
}

module.exports = {
    uploadToCatbox,
    uploadAttachmentToCatbox,
    uploadUrlToCatbox
};

