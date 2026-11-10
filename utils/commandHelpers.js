const fs = require('fs').promises;
const path = require('path');

const DB_PATH = {
    categories: path.join(__dirname, '../database/categories.json'),
    products: path.join(__dirname, '../database/products.json')
};

/**
 * Load categories cho choice options
 */
async function loadCategoryChoices() {
    try {
        const categoriesData = await fs.readFile(DB_PATH.categories, 'utf8');
        const categories = JSON.parse(categoriesData);
        
        if (categories.items && categories.items.length > 0) {
            return categories.items.map(cat => ({
                name: cat.name,
                value: cat.name
            }));
        }
        
        return [];
    } catch (error) {
        console.error('Error loading category choices:', error);
        return [];
    }
}

/**
 * Load products cho choice options
 */
async function loadProductChoices() {
    try {
        const productsData = await fs.readFile(DB_PATH.products, 'utf8');
        const products = JSON.parse(productsData);
        
        if (products.items && products.items.length > 0) {
            return products.items.map(prod => ({
                name: prod.name,
                value: prod.name
            }));
        }
        
        return [];
    } catch (error) {
        console.error('Error loading product choices:', error);
        return [];
    }
}

module.exports = {
    loadCategoryChoices,
    loadProductChoices
};
