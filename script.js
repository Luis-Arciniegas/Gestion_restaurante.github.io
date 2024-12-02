class LicenseManager {
    constructor() {
        // License configuration
        this.licenseConfig = {
            startDate: '2024-01-01', // Format: YYYY-MM-DD
            endDate: '2024-12-31',   // Format: YYYY-MM-DD
            isActive: true
        };
    }

    checkLicense() {
        try {
            const currentDate = new Date();
            const startDate = new Date(this.licenseConfig.startDate);
            const endDate = new Date(this.licenseConfig.endDate);

            // Check if current date is within license period
            if (currentDate >= startDate && currentDate <= endDate && this.licenseConfig.isActive) {
                return true;
            } else {
                // License expired or not active
                const message = currentDate > endDate ? 
                    'Su licencia ha expirado. Por favor, renueve su suscripción.' :
                    'Licencia no válida o inactiva. Contacte al administrador.';
                
                alert(message);
                
                // Disable main functionality
                document.body.innerHTML = `
                    <div style="text-align: center; padding: 50px; color: #e74c3c;">
                        <h1>⚠️ Licencia Expirada</h1>
                        <p>${message}</p>
                        <p>Contacte al soporte técnico para más información.</p>
                    </div>`;
                return false;
            }
        } catch (error) {
            console.error('Error checking license:', error);
            alert('Error al verificar la licencia. Contacte al administrador.');
            return false;
        }
    }

    // Method to update license dates (for admin use)
    updateLicenseDates(startDate, endDate) {
        try {
            // Validate date format
            if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
                throw new Error('Invalid date format. Use YYYY-MM-DD');
            }

            this.licenseConfig.startDate = startDate;
            this.licenseConfig.endDate = endDate;
            return true;
        } catch (error) {
            console.error('Error updating license dates:', error);
            return false;
        }
    }

    // Method to activate/deactivate license
    setLicenseStatus(isActive) {
        this.licenseConfig.isActive = Boolean(isActive);
        return this.licenseConfig.isActive;
    }
}

class PersistentStorage {
    static BACKUP_KEY = 'restaurantBackupData_v1'; // Version key for migrations if needed
    static DEFAULT_CATEGORIES = [
        {
            name: "Bebidas",
            products: [
                {
                    id: 1,
                    name: "Coca Cola",
                    price: 2500,
                    stock: 50
                },
                {
                    id: 2, 
                    name: "Jugo Natural",
                    price: 3000,
                    stock: 30
                }
            ]
        },
        {
            name: "Comidas",
            products: [
                {
                    id: 3,
                    name: "Hamburguesa",
                    price: 12000,
                    stock: 20
                },
                {
                    id: 4,
                    name: "Pizza",
                    price: 15000, 
                    stock: 15
                }
            ]
        }
    ];

    // Save data with multiple fallbacks
    static save(key, data) {
        try {
            // Primary storage in localStorage
            localStorage.setItem(key, JSON.stringify(data));
            
            // Backup in sessionStorage
            sessionStorage.setItem(key, JSON.stringify(data));
            
            // Store in IndexedDB if available
            if (window.indexedDB) {
                this.saveToIndexedDB(key, data);
            }
            
            return true;
        } catch (error) {
            console.error('Error saving data:', error);
            return false;
        }
    }

    // Load data with fallbacks
    static load(key, defaultValue = null) {
        try {
            // Try localStorage first
            let data = localStorage.getItem(key);
            
            if (!data) {
                // Try sessionStorage as backup
                data = sessionStorage.getItem(key);
            }
            
            if (!data) {
                // Try IndexedDB as final backup
                if (window.indexedDB) {
                    return this.loadFromIndexedDB(key) || defaultValue;
                }
            }
            
            return data ? JSON.parse(data) : defaultValue;
        } catch (error) {
            console.error('Error loading data:', error);
            return defaultValue;
        }
    }

    // IndexedDB helpers
    static saveToIndexedDB(key, data) {
        const request = indexedDB.open("RestaurantDB", 1);
        
        request.onerror = (event) => {
            console.error("IndexedDB error:", event.target.error);
        };

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains('data')) {
                db.createObjectStore('data');
            }
        };

        request.onsuccess = (event) => {
            const db = event.target.result;
            const transaction = db.transaction(['data'], 'readwrite');
            const store = transaction.objectStore('data');
            store.put(data, key);
        };
    }

    static loadFromIndexedDB(key) {
        return new Promise((resolve) => {
            const request = indexedDB.open("RestaurantDB", 1);
            
            request.onerror = () => resolve(null);

            request.onsuccess = (event) => {
                const db = event.target.result;
                const transaction = db.transaction(['data'], 'readonly');
                const store = transaction.objectStore('data');
                const dataRequest = store.get(key);
                
                dataRequest.onsuccess = () => {
                    resolve(dataRequest.result);
                };
                
                dataRequest.onerror = () => resolve(null);
            };
        });
    }

    // Initialize with default data if storage is empty
    static initializeDefaultData() {
        const existingData = this.load('restaurantCategories');
        if (!existingData) {
            this.save('restaurantCategories', this.DEFAULT_CATEGORIES);
        }
    }
}

// Modify StoreManager to use PersistentStorage
class StoreManager {
    constructor() {
        this.categories = [];
        this.loadFromStorage();
    }

    loadFromStorage() {
        // Initialize default data if needed
        PersistentStorage.initializeDefaultData();
        
        // Load categories with fallback to defaults
        const savedCategories = PersistentStorage.load(
            'restaurantCategories',
            PersistentStorage.DEFAULT_CATEGORIES
        );
        
        if (savedCategories) {
            this.categories = savedCategories;
        }
    }

    saveToStorage() {
        PersistentStorage.save('restaurantCategories', this.categories);
    }

    addCategory(name) {
        const existingCategory = this.getCategory(name);
        if (existingCategory) {
            return false;
        }

        this.categories.push({
            name: name,
            products: []
        });
        this.saveToStorage();
        return true;
    }

    getCategory(name) {
        return this.categories.find(c => c.name === name);
    }

    deleteCategory(name) {
        const index = this.categories.findIndex(c => c.name === name);
        if (index !== -1) {
            this.categories.splice(index, 1);
            this.saveToStorage();
            return true;
        }
        return false;
    }

    updateCategoryName(oldName, newName) {
        const categoryIndex = this.categories.findIndex(c => c.name === oldName);
        if (categoryIndex === -1) return false;

        // Check if new name already exists
        if (this.categories.some(c => c.name === newName && c.name !== oldName)) {
            return false;
        }

        // Update category name
        this.categories[categoryIndex].name = newName;
        this.saveToStorage();
        return true;
    }

    addProduct(categoryName, product) {
        const category = this.getCategory(categoryName);
        if (!category) {
            return false;
        }

        const newProduct = {
            id: Date.now(),
            name: product.name,
            price: Number(product.price),
            stock: Number(product.stock)
        };

        category.products.push(newProduct);
        this.saveToStorage();
        return true;
    }

    updateProduct(categoryName, productId, updatedProduct) {
        const category = this.getCategory(categoryName);
        if (!category) {
            return false;
        }

        const product = category.products.find(p => p.id === productId);
        if (!product) {
            return false;
        }

        product.name = updatedProduct.name;
        product.price = Number(updatedProduct.price);
        product.stock = Number(updatedProduct.stock);

        this.saveToStorage();
        return true;
    }

    deleteProduct(categoryName, productId) {
        const category = this.getCategory(categoryName);
        if (!category) {
            return false;
        }

        const index = category.products.findIndex(p => p.id === productId);
        if (index !== -1) {
            category.products.splice(index, 1);
            this.saveToStorage();
            return true;
        }
        return false;
    }

    updateProductStock(productName, quantity) {
        for (let category of this.categories) {
            const product = category.products.find(p => p.name === productName);
            if (product) {
                product.stock -= quantity;
                if (product.stock < 0) product.stock = 0;
                this.saveToStorage();
                return true;
            }
        }
        return false;
    }

    getProductByName(productName) {
        for (let category of this.categories) {
            const product = category.products.find(p => p.name === productName);
            if (product) return product;
        }
        return null;
    }

    handleCategorySubmit(event) {
        event.preventDefault();
        const categoryName = document.getElementById('categoryName').value.trim();
        
        if (categoryName) {
            if (this.addCategory(categoryName)) {
                uiManager.closeModal('categoryModal');
                uiManager.changeTab('products');
            } else {
                alert('Ya existe una categoría con ese nombre');
            }
        }
    }

    handleProductSubmit(event) {
        event.preventDefault();
        const modal = document.getElementById('productModal');
        const categoryName = modal.dataset.category;
        const editMode = modal.dataset.editMode === 'true';
        const productId = editMode ? parseInt(modal.dataset.productId) : null;
        
        const product = {
            name: document.getElementById('productName').value.trim(),
            price: parseFloat(document.getElementById('productPrice').value),
            stock: parseInt(document.getElementById('productStock').value)
        };

        if (editMode) {
            if (this.updateProduct(categoryName, productId, product)) {
                uiManager.closeModal('productModal');
                uiManager.viewCategoryProducts(categoryName);
            }
        } else {
            if (this.addProduct(categoryName, product)) {
                uiManager.closeModal('productModal');
                uiManager.viewCategoryProducts(categoryName);
            }
        }
    }
}

// Add event listener to window for storage events
window.addEventListener('storage', (e) => {
    if (e.key === 'restaurantCategories') {
        storeManager.loadFromStorage();
        uiManager.changeTab('products');
    }
});

// Add periodic backup functionality
setInterval(() => {
    if (storeManager && storeManager.categories.length > 0) {
        PersistentStorage.save('restaurantBackupData_v1', storeManager.categories);
    }
}, 60000); // Backup every minute

// CashManager class to handle transactions
class CashManager {
    constructor() {
        this.transactions = [];
        this.dailyProductSales = new Map();
        this.loadFromStorage();
    }

    static CLOSURE_PASSWORD = "123456"; // Changed from "admin123"

    static validateClosurePassword(password) {
        return password === this.CLOSURE_PASSWORD;
    }

    static formatCurrency(amount) {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    loadFromStorage() {
        const savedTransactions = PersistentStorage.load('restaurantTransactions');
        const savedProductSales = PersistentStorage.load('restaurantDailyProductSales');
        
        if (savedTransactions) {
            this.transactions = savedTransactions;
        }
        if (savedProductSales) {
            // Convert the saved array back to Map
            const salesArray = savedProductSales;
            this.dailyProductSales = new Map(salesArray);
        }
    }

    saveToStorage() {
        PersistentStorage.save('restaurantTransactions', this.transactions);
        // Convert Map to array before storing
        PersistentStorage.save('restaurantDailyProductSales', 
            Array.from(this.dailyProductSales.entries()));
    }

    getDailyTransactions() {
        const today = new Date().toISOString().split('T')[0];
        return this.transactions.filter(t => t.timestamp.startsWith(today));
    }

    getDailyTotal() {
        const today = new Date().toISOString().split('T')[0];
        return this.transactions
            .filter(t => t.timestamp.startsWith(today))
            .reduce((total, t) => {
                return total + (t.type === 'income' ? t.amount : -t.amount);
            }, 0);
    }

    getDailySummary() {
        const today = new Date().toISOString().split('T')[0];
        const dailyTransactions = this.getDailyTransactions();
        
        // Separate table sales from other transactions
        const tableSales = dailyTransactions.filter(t => t.tableNumber != null);
        const otherTransactions = dailyTransactions.filter(t => t.tableNumber == null);
        
        // Handle other transactions (non-table transactions only)
        const incomes = otherTransactions.filter(t => t.type === 'income');
        const expenses = otherTransactions.filter(t => t.type === 'expense');
        
        const totalIncomes = incomes.reduce((sum, t) => sum + t.amount, 0);
        const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);
        
        // Group sales by table
        const salesByTable = tableSales.reduce((acc, t) => {
            if (!acc[t.tableNumber]) {
                acc[t.tableNumber] = 0;
            }
            acc[t.tableNumber] += t.amount;
            return acc;
        }, {});

        const totalTableSales = Object.values(salesByTable).reduce((sum, amount) => sum + amount, 0);
            
        return {
            salesByTable,
            productSales: Array.from(this.dailyProductSales.entries()).map(([name, data]) => ({
                name,
                quantity: data.quantity,
                total: data.totalSales
            })),
            totalSales: totalTableSales,
            totalProducts: Array.from(this.dailyProductSales.values())
                .reduce((sum, data) => sum + data.quantity, 0),
            date: today,
            otherTransactions: {
                incomes,
                expenses,
                totalIncomes,
                totalExpenses
            }
        };
    }

    addTransaction(type, amount, description, tableNumber = null) {
        const transaction = {
            type,
            amount: Number(amount),
            description,
            timestamp: new Date().toISOString(),
            tableNumber
        };
        
        this.transactions.push(transaction);
        this.saveToStorage(); // Save after each transaction
        return transaction;
    }

    addProductSale(productName, quantity = 1, price) {
        if (!this.dailyProductSales.has(productName)) {
            this.dailyProductSales.set(productName, {
                quantity: 0,
                totalSales: 0
            });
        }
        const currentSales = this.dailyProductSales.get(productName);
        currentSales.quantity += quantity;
        currentSales.totalSales += price;
        this.dailyProductSales.set(productName, currentSales);
        this.saveToStorage(); // Save after each product sale
    }

    closeDay() {
        const summary = this.getDailySummary();
        const closureHistory = PersistentStorage.load('closureHistory') || [];
        closureHistory.unshift(summary);
        PersistentStorage.save('closureHistory', closureHistory);
        
        // Clear transactions and product sales
        this.transactions = [];
        this.dailyProductSales = new Map();
        
        // Clear from storage
        this.saveToStorage();
        
        return summary;
    }

    generateDailySummaryHTML(summary) {
        return `
            <div class="daily-closure-summary">
                <div class="category-header">
                    <button class="back-button" onclick="uiManager.exitDaySummary()">
                        <span>↩️</span> Volver
                    </button>
                    <button class="category-btn" onclick="window.print()">
                        <span>🖨️</span> Imprimir
                    </button>
                    <button class="category-btn" onclick="uiManager.confirmClosureDay()">
                        <span>✅</span> Confirmar Cierre
                    </button>
                </div>

                <div class="summary-section">
                    <h4>Ventas por Mesa</h4>
                    <table class="summary-table">
                        <thead>
                            <tr>
                                <th>Mesa</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.entries(summary.salesByTable).map(([table, total]) => `
                                <tr>
                                    <td>Mesa ${table}</td>
                                    <td class="amount">${CashManager.formatCurrency(total)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td><strong>Total Ventas por Mesa</strong></td>
                                <td class="amount"><strong>${CashManager.formatCurrency(summary.totalSales)}</strong></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div class="summary-section">
                    <h4>Detalle de Productos Vendidos</h4>
                    <table class="summary-table">
                        <thead>
                            <tr>
                                <th>Producto</th>
                                <th>Cantidad</th>
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${summary.productSales.map(product => `
                                <tr>
                                    <td>${product.name}</td>
                                    <td>${product.quantity}</td>
                                    <td class="amount">${CashManager.formatCurrency(product.total)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="2"><strong>Total Productos</strong></td>
                                <td class="amount"><strong>${CashManager.formatCurrency(summary.totalSales)}</strong></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div class="summary-section">
                    <h4>Otras Transacciones</h4>
                    <table class="summary-table">
                        <thead>
                            <tr>
                                <th>Tipo</th>
                                <th>Descripción</th>
                                <th>Monto</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${summary.otherTransactions.incomes.map(t => `
                                <tr>
                                    <td>Ingreso</td>
                                    <td>${t.description}</td>
                                    <td class="amount">${CashManager.formatCurrency(t.amount)}</td>
                                </tr>
                            `).join('')}
                            ${summary.otherTransactions.expenses.map(t => `
                                <tr>
                                    <td>Egreso</td>
                                    <td>${t.description}</td>
                                    <td class="amount">-${CashManager.formatCurrency(t.amount)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="2"><strong>Total Otros Ingresos</strong></td>
                                <td class="amount"><strong>${CashManager.formatCurrency(summary.otherTransactions.totalIncomes)}</strong></td>
                            </tr>
                            <tr>
                                <td colspan="2"><strong>Total Otros Egresos</strong></td>
                                <td class="amount"><strong>-${CashManager.formatCurrency(summary.otherTransactions.totalExpenses)}</strong></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div class="summary-section summary-total">
                    <table class="summary-table">
                        <tr>
                            <td><strong>TOTAL VENTAS</strong></td>
                            <td class="amount"><strong>${CashManager.formatCurrency(summary.totalSales)}</strong></td>
                        </tr>
                        <tr>
                            <td><strong>TOTAL OTRAS TRANSACCIONES</strong></td>
                            <td class="amount"><strong>${CashManager.formatCurrency(summary.otherTransactions.totalIncomes - summary.otherTransactions.totalExpenses)}</strong></td>
                        </tr>
                        <tr>
                            <td><strong>TOTAL DEL DÍA</strong></td>
                            <td class="amount"><strong>${CashManager.formatCurrency(summary.totalSales + summary.otherTransactions.totalIncomes - summary.otherTransactions.totalExpenses)}</strong></td>
                        </tr>
                    </table>
                </div>
            </div>`;
    }
}

// TableManager class to manage tables
class TableManager {
    constructor() {
        this.tables = [];
        this.loadFromStorage();
        this.initializeTables(); // Initialize tables on startup
    }

    loadFromStorage() {
        const savedTables = PersistentStorage.load('restaurantTables');
        if (savedTables) {
            this.tables = savedTables;
            this.fixTableStates();
        }
    }

    saveToStorage() {
        PersistentStorage.save('restaurantTables', this.tables);
    }

    createTable() {
        const newTableNumber = this.tables.length > 0 
            ? Math.max(...this.tables.map(t => t.number)) + 1 
            : 1;
            
        const newTable = {
            number: newTableNumber,
            status: 'available',
            currentOrder: {
                items: [],
                total: 0
            }
        };

        this.tables.push(newTable);
        this.saveToStorage();
        return newTableNumber;
    }

    occupyTable(tableNumber) {
        const table = this.getTable(tableNumber);
        if (table) {
            table.status = table.currentOrder.items.length > 0 ? 'occupied' : 'available';
            this.saveToStorage();
            return true;
        }
        return false;
    }

    getTable(tableNumber) {
        if (typeof tableNumber !== 'number') {
            console.error('Invalid table number type:', typeof tableNumber);
            return null;
        }
        return this.tables.find(t => t.number === tableNumber);
    }

    getAllTables() {
        return [...this.tables];
    }

    addItemToTable(tableNumber, product) {
        const table = this.getTable(tableNumber);
        if (table) {
            if (!Array.isArray(table.currentOrder.items)) {
                table.currentOrder.items = [];
            }

            table.currentOrder.items.push({
                name: product.name,
                price: Number(product.price)
            });
            
            table.currentOrder.total = table.currentOrder.items.reduce(
                (sum, item) => sum + (Number(item.price) || 0), 
                0
            );
            
            table.status = table.currentOrder.items.length > 0 ? 'occupied' : 'available';
            
            this.saveToStorage();
            return true;
        }
        return false;
    }

    removeOrderItem(tableNumber, itemIndex) {
        const table = this.getTable(tableNumber);
        if (!table || !table.currentOrder || !Array.isArray(table.currentOrder.items)) {
            return false;
        }

        if (itemIndex >= 0 && itemIndex < table.currentOrder.items.length) {
            table.currentOrder.items.splice(itemIndex, 1);
            table.currentOrder.total = table.currentOrder.items.reduce(
                (sum, item) => sum + (item.price || 0), 
                0
            );
            table.status = table.currentOrder.items.length > 0 ? 'occupied' : 'available';
            this.saveToStorage();
            return true;
        }
        return false;
    }

    releaseTable(tableNumber) {
        const table = this.getTable(tableNumber);
        if (table) {
            table.status = 'available';
            table.currentOrder = { 
                items: [], 
                total: 0 
            };
            this.saveToStorage();
            return true;
        }
        return false;
    }

    validateTableData(tableNumber) {
        let table = this.getTable(tableNumber);
        if (!table) {
            return null;
        }

        // Ensure proper table structure
        if (!table.currentOrder || !Array.isArray(table.currentOrder.items)) {
            table.currentOrder = {
                items: [],
                total: 0
            };
        }

        // Reset status if needed
        if (table.currentOrder.items.length === 0) {
            table.status = 'available';
        }

        // Validate each item in the order
        table.currentOrder.items = table.currentOrder.items.filter(item => 
            item && typeof item === 'object' && 
            item.name && 
            typeof item.price === 'number'
        );

        // Recalculate total
        table.currentOrder.total = table.currentOrder.items.reduce(
            (sum, item) => sum + (Number(item.price) || 0), 
            0
        );

        this.saveToStorage();
        return table;
    }

    fixTableStates() {
        this.tables.forEach(table => {
            // Ensure proper table structure
            if (!table.currentOrder || !Array.isArray(table.currentOrder.items)) {
                table.currentOrder = {
                    items: [],
                    total: 0
                };
            }
            
            // Reset status based on items
            table.status = table.currentOrder.items.length > 0 ? 'occupied' : 'available';
            
            // Ensure total is calculated correctly
            table.currentOrder.total = table.currentOrder.items.reduce(
                (sum, item) => sum + (Number(item.price) || 0),
                0
            );
        });
        
        this.saveToStorage();
    }

    deleteTable(tableNumber) {
        const tableIndex = this.tables.findIndex(t => t.number === tableNumber);
        const table = this.tables[tableIndex];
        
        if (tableIndex === -1) {
            return false;
        }
        
        if (table.status === 'occupied' || (table.currentOrder && table.currentOrder.items.length > 0)) {
            alert('No se puede eliminar una mesa ocupada');
            return false;
        }
        
        this.tables.splice(tableIndex, 1);
        this.saveToStorage();
        return true;
    }

    hasOccupiedTables() {
        return this.tables.some(table => 
            table.status === 'occupied' || 
            (table.currentOrder && table.currentOrder.items.length > 0)
        );
    }

    splitBill(sourceTableNumber, selectedItems) {
        const sourceTable = this.getTable(sourceTableNumber);
        if (!sourceTable || !sourceTable.currentOrder || !Array.isArray(sourceTable.currentOrder.items)) {
            return null;
        }

        // Create new table for split items
        const newTableNumber = this.createTable();
        const newTable = this.getTable(newTableNumber);

        // Sort selectedItems in descending order to remove from end first
        const sortedIndexes = selectedItems.sort((a, b) => b - a);
        
        // Move selected items to new table
        sortedIndexes.forEach(index => {
            if (index >= 0 && index < sourceTable.currentOrder.items.length) {
                const item = sourceTable.currentOrder.items[index];
                newTable.currentOrder.items.push(item);
                sourceTable.currentOrder.items.splice(index, 1);
            }
        });

        // Recalculate totals
        sourceTable.currentOrder.total = sourceTable.currentOrder.items.reduce(
            (sum, item) => sum + (Number(item.price) || 0),
            0
        );
        
        newTable.currentOrder.total = newTable.currentOrder.items.reduce(
            (sum, item) => sum + (Number(item.price) || 0),
            0
        );

        // Update table statuses
        sourceTable.status = sourceTable.currentOrder.items.length > 0 ? 'occupied' : 'available';
        newTable.status = newTable.currentOrder.items.length > 0 ? 'occupied' : 'available';

        this.saveToStorage();
        return newTableNumber;
    }

    initializeTables() {
        // Reset all tables to initial state
        this.tables = this.tables.map(table => ({
            number: table.number,
            status: 'available',
            currentOrder: {
                items: [],
                total: 0
            }
        }));
        
        // Save clean state
        this.saveToStorage();
    }

    validateTableOrder(tableNumber) {
        const table = this.getTable(tableNumber);
        if (!table) {
            return false;
        }

        // Ensure proper order structure
        if (!table.currentOrder || typeof table.currentOrder !== 'object') {
            table.currentOrder = {
                items: [],
                total: 0
            };
        }

        // Ensure items array exists
        if (!Array.isArray(table.currentOrder.items)) {
            table.currentOrder.items = [];
        }

        // Recalculate total
        table.currentOrder.total = table.currentOrder.items.reduce(
            (sum, item) => sum + (Number(item.price) || 0),
            0
        );

        // Update status based on items
        table.status = table.currentOrder.items.length > 0 ? 'occupied' : 'available';

        this.saveToStorage();
        return true;
    }
}

// Modify UIManager to integrate cash management with tables
class UIManager {
    constructor() {
        this.modals = {};
        this.initializeModals();
        this.bindEvents();
    }

    initializeModals() {
        const modalIds = ['cashModal', 'categoryModal', 'productModal', 'tableOrderModal', 'closureHistoryModal', 'passwordModal'];
        modalIds.forEach(id => {
            const modal = document.getElementById(id);
            if (modal) {
                this.modals[id] = modal;
                modal.addEventListener('click', (e) => {
                    if (e.target === modal) {
                        this.closeModal(id);
                    }
                });
            }
        });
    }

    bindEvents() {
        document.querySelectorAll('.tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.getAttribute('data-tab');
                if (tabName) {
                    this.changeTab(tabName);
                }
            });
        });
    }

    changeTab(tabName) {
        document.querySelectorAll('.tab').forEach(tab => {
            tab.classList.toggle('active', tab.getAttribute('data-tab') === tabName);
        });

        const mainContent = document.getElementById('mainContent');
        
        if (tabName === 'tables') {
            mainContent.innerHTML = `
                <div class="daily-summary">
                    <h3>Resumen del Día</h3>
                    <div>Total del día: ${CashManager.formatCurrency(cashManager.getDailyTotal())}</div>
                    <div class="daily-actions">
                        <button class="category-btn" onclick="uiManager.handleEndDay()">
                            <span>📊</span> 
                            Cerrar Día
                        </button>
                        <button class="category-btn" onclick="uiManager.openCashModal()">
                            <span>💰</span> 
                            Entrada/Salida
                        </button>
                    </div>
                </div>
                <div class="tables-header">
                    <button class="add-table-btn" onclick="uiManager.addTable()">
                        <span>➕</span>
                        Agregar Mesa
                    </button>
                    <button class="refresh-tables-btn" onclick="uiManager.refreshTables()">
                        <span>🔄</span>
                        Actualizar Mesas
                    </button>
                </div>
                <div class="tables-grid">
                    ${tableManager.getAllTables().map(table => `
                        <div class="table-card ${table.status}" 
                             onclick="uiManager.handleTableClick(${table.number})"
                             data-table-number="${table.number}">
                            <button class="delete-table-btn" 
                                    onclick="event.stopPropagation(); uiManager.deleteTable(${table.number})"
                                    ${table.status === 'occupied' ? 'disabled' : ''}>
                                ×
                            </button>
                            <div class="table-header">
                                <h3>Mesa ${table.number}</h3>
                                <div class="table-status">
                                    <span class="status-indicator"></span>
                                    ${table.status === 'occupied' ? 'Ocupada' : 'Disponible'}
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>`;
        } else if (tabName === 'products') {
            mainContent.innerHTML = `
                <div class="category-header">
                    <button class="category-btn" onclick="uiManager.openCategoryForm()">
                        <span>➕</span>
                        Nueva Categoría
                    </button>
                </div>
                <div class="product-grid">
                    ${storeManager.categories.map(category => `
                        <div class="product-card">
                            <h3>${category.name}</h3>
                            <p class="product-count">
                                ${category.products.length} producto${category.products.length !== 1 ? 's' : ''}
                            </p>
                            <div class="product-actions">
                                <div class="action-buttons-stack">
                                    <button class="action-button" onclick="uiManager.viewCategoryProducts('${category.name}')">
                                        <span>🔍</span>
                                        Ver Productos
                                    </button>
                                    <button class="action-button" onclick="uiManager.editCategoryName('${category.name}')">
                                        <span>✏️</span>
                                        Editar Nombre
                                    </button>
                                </div>
                                <button class="cancel-btn" onclick="uiManager.deleteCategory('${category.name}')">
                                    <span>🗑️</span>
                                    Eliminar
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>`;
        }
    }

    refreshTables() {
        tableManager.fixTableStates();
        this.changeTab('tables');
    }

    loadProductsForTable() {
        const productsPanel = document.querySelector('.products-panel');
        
        // Clear existing content
        const categoryButtons = document.createElement('div');
        categoryButtons.className = 'category-buttons';
        
        // Add category buttons
        storeManager.categories.forEach(category => {
            const button = document.createElement('button');
            button.className = 'category-btn';
            button.textContent = category.name;
            button.onclick = () => this.showCategoryProducts(category.name);
            categoryButtons.appendChild(button);
        });

        const productsList = document.createElement('div');
        productsList.className = 'products-list';
        productsList.id = 'productsList';

        productsPanel.innerHTML = '';
        productsPanel.appendChild(categoryButtons);
        productsPanel.appendChild(productsList);

        // Show first category's products by default if exists
        if (storeManager.categories.length > 0) {
            this.showCategoryProducts(storeManager.categories[0].name);
        }
    }

    showCategoryProducts(categoryName) {
        const productsList = document.getElementById('productsList');
        const category = storeManager.getCategory(categoryName);
        
        if (!category || !productsList) return;

        // Update active category button
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.toggle('active', btn.textContent === categoryName);
        });

        const tableNumber = parseInt(document.getElementById('tableOrderModal').dataset.tableNumber);

        productsList.innerHTML = category.products.map(product => `
            <div class="product-item" 
                 onclick="uiManager.addProductToTable(${tableNumber}, '${product.name}', ${product.price})">
                <div class="product-name">${product.name}</div>
                <div class="product-price">${CashManager.formatCurrency(product.price)}</div>
                <div class="stock-info">Stock: ${product.stock}</div>
            </div>
        `).join('');
    }

    addProductToTable(tableNumber, productName, price) {
        const product = storeManager.getProductByName(productName);
        
        if (!product) return;
        
        if (product.stock <= 0) {
            if (!confirm('Este producto está sin stock. ¿Desea agregarlo de todas formas?')) {
                return;
            }
        }
        
        if (tableManager.addItemToTable(tableNumber, product)) {
            this.handleTableClick(tableNumber); // Refresh the display
        }
    }

    deleteCategory(categoryName) {
        if (confirm(`¿Está seguro de eliminar la categoría ${categoryName}?`)) {
            if (storeManager.deleteCategory(categoryName)) {
                this.changeTab('products');
            }
        }
    }

    viewCategoryProducts(categoryName) {
        const mainContent = document.getElementById('mainContent');
        const category = storeManager.getCategory(categoryName);
        
        if (!category) return;

        mainContent.innerHTML = `
            <div class="category-header">
                <button class="back-button" onclick="uiManager.changeTab('products')">
                    <span>↩️</span> Volver
                </button>
                <button class="category-btn" onclick="uiManager.openProductForm('${categoryName}')">
                    <span>➕</span> Nuevo Producto
                </button>
            </div>
            <div class="product-grid">
                ${category.products.map(product => `
                    <div class="product-card">
                        <h3>${product.name}</h3>
                        <div class="price">${CashManager.formatCurrency(product.price)}</div>
                        <div class="stock">Stock: ${product.stock}</div>
                        <div class="product-actions">
                            <button class="action-button" 
                                    onclick="uiManager.editProduct('${categoryName}', ${product.id})">
                                <span>✏️</span>
                                Editar
                            </button>
                            <button class="cancel-btn" 
                                    onclick="uiManager.deleteProduct('${categoryName}', ${product.id})">
                                <span>🗑️</span>
                                Eliminar
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>`;
    }

    openProductForm(categoryName, product = null) {
        const modal = document.getElementById('productModal');
        const form = document.getElementById('productForm');
        
        // Reset form
        form.reset();
        
        modal.dataset.category = categoryName;
        modal.dataset.editMode = !!product;
        if (product) {
            modal.dataset.productId = product.id;
            document.getElementById('productName').value = product.name;
            document.getElementById('productPrice').value = product.price;
            document.getElementById('productStock').value = product.stock;
        }

        // Update form submission handler
        form.onsubmit = (event) => this.handleProductSubmit(event);
        
        this.openModal('productModal');
    }

    editProduct(categoryName, productId) {
        const category = storeManager.getCategory(categoryName);
        if (!category) return;

        const product = category.products.find(p => p.id === productId);
        if (!product) return;

        // Open the product form in edit mode with the product data
        this.openProductForm(categoryName, product);
    }

    deleteProduct(categoryName, productId) {
        if (confirm('¿Está seguro de eliminar este producto?')) {
            const category = storeManager.getCategory(categoryName);
            if (!category) return;

            const product = category.products.find(p => p.id === productId);
            if (!product) return;

            if (storeManager.deleteProduct(categoryName, productId)) {
                // Refresh the category products view
                this.viewCategoryProducts(categoryName);
            }
        }
    }

    handleProductSubmit(event) {
        event.preventDefault();
        const modal = document.getElementById('productModal');
        const categoryName = modal.dataset.category;
        const editMode = modal.dataset.editMode === 'true';
        const productId = editMode ? parseInt(modal.dataset.productId) : null;
        
        const product = {
            name: document.getElementById('productName').value.trim(),
            price: parseFloat(document.getElementById('productPrice').value),
            stock: parseInt(document.getElementById('productStock').value)
        };

        if (editMode) {
            if (storeManager.updateProduct(categoryName, productId, product)) {
                this.closeModal('productModal');
                this.viewCategoryProducts(categoryName);
            }
        } else {
            if (storeManager.addProduct(categoryName, product)) {
                this.closeModal('productModal');
                this.viewCategoryProducts(categoryName);
            }
        }
    }

    openCategoryForm() {
        // Reset the form
        const form = document.getElementById('categoryForm');
        if (form) {
            form.reset();
        }
        
        // Update form submission handler
        form.onsubmit = (event) => {
            event.preventDefault();
            storeManager.handleCategorySubmit(event);
        };
        
        // Open the category modal
        this.openModal('categoryModal');
    }

    editCategoryName(categoryName) {
        const newName = prompt('Ingrese el nuevo nombre para la categoría:', categoryName);
        
        if (!newName || newName.trim() === '') {
            return; // User canceled or empty input
        }
        
        if (storeManager.updateCategoryName(categoryName, newName.trim())) {
            alert('Nombre de categoría actualizado exitosamente');
            this.changeTab('products'); // Refresh view
        } else {
            alert('No se pudo actualizar el nombre. Posiblemente ya existe una categoría con ese nombre.');
        }
    }

    handleEndDay() {
        if (tableManager.hasOccupiedTables()) {
            alert('No se puede cerrar el día con mesas ocupadas');
            return;
        }

        const summary = cashManager.getDailySummary();
        const mainContent = document.getElementById('mainContent');
        mainContent.innerHTML = cashManager.generateDailySummaryHTML(summary);
    }

    confirmClosureDay() {
        if (tableManager.hasOccupiedTables()) {
            alert('No se puede cerrar el día con mesas ocupadas');
            return;
        }
        
        // Open password modal
        this.openPasswordConfirmation();
    }

    openPasswordConfirmation() {
        const modal = document.getElementById('passwordModal');
        const form = document.getElementById('passwordForm');
        
        // Reset password field
        const passwordInput = document.getElementById('closurePassword');
        if (passwordInput) {
            passwordInput.value = '';
        }
        
        // Update form submission handler
        if (form) {
            form.onsubmit = (e) => this.handlePasswordSubmit(e);
        }
        
        this.openModal('passwordModal');
    }

    handlePasswordSubmit(event) {
        event.preventDefault();
        const password = document.getElementById('closurePassword').value;

        if (CashManager.validateClosurePassword(password)) {
            // Password correct - proceed with closure
            this.closeModal('passwordModal');
            
            // Close the day and reinitialize tables
            cashManager.closeDay();
            tableManager.initializeTables();
            
            // Show success message
            alert('Cierre exitoso');
            
            // Refresh the tables view to show empty state
            this.changeTab('tables');
        } else {
            // Password incorrect
            alert('Contraseña incorrecta');
            document.getElementById('closurePassword').value = '';
        }
    }

    openModal(modalId) {
        const modal = this.modals[modalId];
        if (modal) {
            modal.classList.add('show');
        }
    }

    closeModal(modalId) {
        const modal = this.modals[modalId];
        if (modal) {
            modal.classList.remove('show');
        }
    }

    openCashModal() {
        // Reset form values
        document.getElementById('transactionType').value = 'income';
        document.getElementById('transactionAmount').value = '';
        document.getElementById('transactionDescription').value = '';
        
        // Open the modal
        this.openModal('cashModal');
    }

    addTable() {
        const newTableNumber = tableManager.createTable();
        if (newTableNumber) {
            // Refresh the tables view
            this.changeTab('tables');
        }
    }

    deleteTable(tableNumber) {
        if (confirm(`¿Está seguro de eliminar la mesa ${tableNumber}?`)) {
            if (tableManager.deleteTable(tableNumber)) {
                // Refresh the tables view
                this.changeTab('tables');
            }
        }
    }

    handleTableClick(tableNumber) {
        // Validate and sanitize table number
        tableNumber = parseInt(tableNumber);
        if (!tableNumber || !tableManager.validateTableOrder(tableNumber)) {
            console.error('Invalid table number:', tableNumber);
            return;
        }

        const table = tableManager.getTable(tableNumber);
        if (!table) {
            console.error('Table not found:', tableNumber);
            return;
        }

        // Open table order modal
        const modal = document.getElementById('tableOrderModal');
        modal.dataset.tableNumber = tableNumber;
        document.getElementById('currentTableNumber').textContent = tableNumber;

        // Update order items display
        const orderItemsContainer = document.getElementById('orderItems');
        orderItemsContainer.innerHTML = table.currentOrder.items.map((item, index) => `
            <div class="order-item">
                <input type="checkbox" class="split-select" data-index="${index}">
                <div>
                    <div>${item.name}</div>
                    <div>${CashManager.formatCurrency(item.price)}</div>
                </div>
                <button class="remove-item" onclick="uiManager.removeOrderItem(${tableNumber}, ${index})">×</button>
            </div>
        `).join('');

        // Update order total
        document.getElementById('orderTotal').textContent = 
            CashManager.formatCurrency(table.currentOrder.total);

        // Load products panel
        this.loadProductsForTable();

        // Open modal
        this.openModal('tableOrderModal');

        // Add event listeners for table actions
        this.setupTableActionListeners(tableNumber);
    }

    setupTableActionListeners(tableNumber) {
        // Close table button
        document.querySelector('.close-table').onclick = () => this.closeTable(tableNumber);
        
        // Exit table button
        document.querySelector('.exit-table').onclick = () => this.closeModal('tableOrderModal');
        
        // Split bill button
        document.querySelector('.split-bill').onclick = () => this.handleSplitBill(tableNumber);
    }

    removeOrderItem(tableNumber, itemIndex) {
        if (tableManager.removeOrderItem(tableNumber, itemIndex)) {
            this.handleTableClick(tableNumber); // Refresh display
        }
    }

    closeTable(tableNumber) {
        const table = tableManager.getTable(tableNumber);
        if (!table || table.currentOrder.items.length === 0) {
            alert('No hay items para cobrar');
            return;
        }

        // Process each item for inventory
        table.currentOrder.items.forEach(item => {
            const product = storeManager.getProductByName(item.name);
            if (product) {
                // Update product stock
                storeManager.updateProductStock(item.name, 1);
                // Add to cash manager's product sales
                cashManager.addProductSale(item.name, 1, item.price);
            }
        });

        // Add transaction to cash manager
        cashManager.addTransaction(
            'income',
            table.currentOrder.total,
            `Mesa ${tableNumber}`,
            tableNumber
        );

        // Release table
        tableManager.releaseTable(tableNumber);
        
        // Close modal and refresh view
        this.closeModal('tableOrderModal');
        this.changeTab('tables');
    }

    handleSplitBill(tableNumber) {
        const selectedItems = Array.from(document.querySelectorAll('.split-select:checked'))
            .map(checkbox => parseInt(checkbox.dataset.index));

        if (selectedItems.length === 0) {
            alert('Seleccione los items a dividir');
            return;
        }

        // Preview the new table number before splitting
        const newTableNumber = tableManager.tables.length > 0 
            ? Math.max(...tableManager.tables.map(t => t.number)) + 1 
            : 1;

        if (confirm(`Los items seleccionados serán movidos a la Mesa ${newTableNumber}. ¿Desea continuar?`)) {
            const splitResult = tableManager.splitBill(tableNumber, selectedItems);
            if (splitResult) {
                alert(`Items movidos exitosamente a la Mesa ${splitResult}`);
                this.closeModal('tableOrderModal');
                this.changeTab('tables');
            }
        }
    }

    exitDaySummary() {
        // Simply return to the tables view
        this.changeTab('tables');
    }

    handleTransaction(event) {
        event.preventDefault();
        
        const type = document.getElementById('transactionType').value;
        const amount = parseFloat(document.getElementById('transactionAmount').value);
        const description = document.getElementById('transactionDescription').value;

        if (isNaN(amount) || amount <= 0) {
            alert('Por favor ingrese un monto válido');
            return;
        }

        if (!description) {
            alert('Por favor ingrese una descripción');
            return;
        }

        // Add transaction
        cashManager.addTransaction(type, amount, description);

        // Close modal and refresh view
        this.closeModal('cashModal');
        this.changeTab('tables'); // Refresh the display to show updated total

        // Clear form
        document.getElementById('transactionForm').reset();
    }
}

// Initialize managers
const cashManager = new CashManager();
const tableManager = new TableManager();
const storeManager = new StoreManager();
const uiManager = new UIManager();

// Document ready handler that checks license and initializes app
document.addEventListener('DOMContentLoaded', () => {
    // Create license manager instance
    const licenseManager = new LicenseManager();
    
    // Check license before initializing the application
    if (!licenseManager.checkLicense()) {
        return; // Exit if license check fails
    }

    // Initialize all managers if license is valid
    if (typeof storeManager === 'undefined') {
        window.storeManager = new StoreManager();
    }
    if (typeof tableManager === 'undefined') {
        window.tableManager = new TableManager();
    }
    if (typeof cashManager === 'undefined') {
        window.cashManager = new CashManager();
    }
    if (typeof uiManager === 'undefined') {
        window.uiManager = new UIManager();
    }

    // Force table validation on startup
    tableManager.initializeTables();
    
    // Set initial view
    uiManager.changeTab('tables');
});