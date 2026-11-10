const fs = require('fs').promises;
const path = require('path');

class Database {
    constructor() {
        this.dataPath = path.join(__dirname, '../database');
        this.data = {};
        this.lastFeedbackEmbed = null; // Lưu ID tin nhắn embed cuối cùng
    }

    async init() {
        try {
            await fs.mkdir(this.dataPath, { recursive: true });
            await this.loadData();
            console.log('✅ Database initialized');
        } catch (error) {
            console.error('❌ Database init error:', error);
        }
    }

    async loadData() {
        try {
            const dataFile = await fs.readFile(path.join(this.dataPath, 'data.json'), 'utf8');
            this.data = JSON.parse(dataFile);
            // Load last feedback embed ID
            this.lastFeedbackEmbed = this.data.lastFeedbackEmbed || null;
        } catch (error) {
            this.data = {};
            this.lastFeedbackEmbed = null;
        }
    }

    async saveData() {
        try {
            // Lưu last feedback embed ID vào data
            this.data.lastFeedbackEmbed = this.lastFeedbackEmbed;
            
            await fs.writeFile(
                path.join(this.dataPath, 'data.json'),
                JSON.stringify(this.data, null, 2)
            );
        } catch (error) {
            console.error('❌ Save data error:', error);
        }
    }

    // Các phương thức cơ bản
    set(key, value) {
        this.data[key] = value;
        this.saveData();
    }

    get(key) {
        return this.data[key];
    }

    delete(key) {
        delete this.data[key];
        this.saveData();
    }

    has(key) {
        return key in this.data;
    }

    getAll() {
        return this.data;
    }

    clear() {
        this.data = {};
        this.lastFeedbackEmbed = null;
        this.saveData();
    }

    // Phương thức cho feedback embed
    setLastFeedbackEmbed(messageId) {
        this.lastFeedbackEmbed = messageId;
        this.saveData();
    }

    getLastFeedbackEmbed() {
        return this.lastFeedbackEmbed;
    }
}

module.exports = Database;

module.exports = Database;