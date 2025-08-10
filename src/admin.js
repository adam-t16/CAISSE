// ===== ADMIN SCRIPT =====

class AdminApp {
    constructor() {
        this.currentEditId = null;
        this.init();
    }

    init() {
        this.initTheme();
        this.bindEvents();
        this.loadProducts();
    }

    // Theme management
    initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeIcon(savedTheme);
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        this.updateThemeIcon(newTheme);
    }

    updateThemeIcon(theme) {
        const themeIcon = document.querySelector('#theme-toggle i');
        themeIcon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }

    // Event binding
    bindEvents() {
        // Theme toggle
        document.getElementById('theme-toggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Add product
        document.getElementById('add-product-btn').addEventListener('click', () => {
            this.openProductModal();
        });

        // Search products
        document.getElementById('search-products').addEventListener('input', (e) => {
            this.filterProducts(e.target.value);
        });

        // Product form
        document.getElementById('product-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProduct();
        });

        // Modal controls
        document.getElementById('close-product-modal').addEventListener('click', () => {
            this.closeProductModal();
        });

        document.getElementById('cancel-product').addEventListener('click', () => {
            this.closeProductModal();
        });

        // Delete modal
        document.getElementById('close-delete-modal').addEventListener('click', () => {
            this.closeDeleteModal();
        });

        document.getElementById('cancel-delete').addEventListener('click', () => {
            this.closeDeleteModal();
        });

        document.getElementById('confirm-delete').addEventListener('click', () => {
            this.confirmDelete();
        });

        // Real-time benefit calculation
        document.getElementById('product-cost').addEventListener('input', () => {
            this.updateBenefitPreview();
        });

        document.getElementById('product-price').addEventListener('input', () => {
            this.updateBenefitPreview();
        });

        // Barcode validation
        document.getElementById('product-barcode').addEventListener('input', (e) => {
            this.validateBarcode(e.target);
        });
    }

    // Product management
    getProducts() {
        return JSON.parse(localStorage.getItem('products') || '[]');
    }

    saveProducts(products) {
        localStorage.setItem('products', JSON.stringify(products));
    }

    loadProducts() {
        const products = this.getProducts();
        this.displayProducts(products);
    }

    displayProducts(products) {
        const tbody = document.getElementById('products-tbody');
        const noProducts = document.getElementById('no-products');

        if (products.length === 0) {
            tbody.innerHTML = '';
            noProducts.classList.remove('hidden');
            return;
        }

        noProducts.classList.add('hidden');

        tbody.innerHTML = products.map(product => {
            const benefit = product.price - product.cost;
            const stockClass = product.stock === 0 ? 'stock-out' : 
                             product.stock < 10 ? 'stock-low' : '';
            const benefitClass = benefit > 0 ? 'benefit-positive' : '';

            return `
                <tr>
                    <td>${product.name}</td>
                    <td>${product.barcode}</td>
                    <td>${product.cost.toFixed(2)} DH</td>
                    <td>${product.price.toFixed(2)} DH</td>
                    <td class="${stockClass}">${product.stock}</td>
                    <td class="${benefitClass}">${benefit.toFixed(2)} DH</td>
                    <td class="product-actions">
                        <button class="action-btn edit-btn" onclick="admin.editProduct('${product.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete-btn" onclick="admin.deleteProduct('${product.id}', '${product.name}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    filterProducts(query) {
        const products = this.getProducts();
        const filtered = products.filter(product => 
            product.name.toLowerCase().includes(query.toLowerCase()) ||
            product.barcode.includes(query)
        );
        this.displayProducts(filtered);
    }

    // Product modal
    openProductModal(productId = null) {
        const modal = document.getElementById('product-modal');
        const modalTitle = document.getElementById('modal-title');
        const form = document.getElementById('product-form');

        this.currentEditId = productId;

        if (productId) {
            // Edit mode
            modalTitle.textContent = 'Modifier le produit';
            const product = this.getProducts().find(p => p.id === productId);
            
            document.getElementById('product-name').value = product.name;
            document.getElementById('product-barcode').value = product.barcode;
            document.getElementById('product-cost').value = product.cost;
            document.getElementById('product-price').value = product.price;
            document.getElementById('product-stock').value = product.stock;
        } else {
            // Add mode
            modalTitle.textContent = 'Ajouter un produit';
            form.reset();
        }

        this.updateBenefitPreview();
        modal.classList.remove('hidden');
        
        // Focus first field
        document.getElementById('product-name').focus();
    }

    closeProductModal() {
        const modal = document.getElementById('product-modal');
        modal.classList.add('hidden');
        this.currentEditId = null;
        document.getElementById('product-form').reset();
    }

    saveProduct() {
        const name = document.getElementById('product-name').value.trim();
        const barcode = document.getElementById('product-barcode').value.trim();
        const cost = parseFloat(document.getElementById('product-cost').value);
        const price = parseFloat(document.getElementById('product-price').value);
        const stock = parseInt(document.getElementById('product-stock').value) || 0;

        // Validation
        if (!name) {
            this.showToast('Le nom du produit est requis', 'error');
            return;
        }

        if (!barcode) {
            this.showToast('Le code-barres est requis', 'error');
            return;
        }

        if (!/^\d+$/.test(barcode)) {
            this.showToast('Le code-barres doit contenir uniquement des chiffres', 'error');
            return;
        }

        if (isNaN(cost) || cost < 0) {
            this.showToast('Le prix d\'achat doit être un nombre positif', 'error');
            return;
        }

        if (isNaN(price) || price < 0) {
            this.showToast('Le prix de vente doit être un nombre positif', 'error');
            return;
        }

        if (stock < 0) {
            this.showToast('Le stock doit être un nombre positif', 'error');
            return;
        }

        const products = this.getProducts();

        // Check for duplicate barcode (except when editing same product)
        const existingProduct = products.find(p => p.barcode === barcode && p.id !== this.currentEditId);
        if (existingProduct) {
            this.showToast('Ce code-barres existe déjà', 'error');
            return;
        }

        if (this.currentEditId) {
            // Update existing product
            const productIndex = products.findIndex(p => p.id === this.currentEditId);
            const oldStock = products[productIndex].stock;
            
            products[productIndex] = {
                ...products[productIndex],
                name,
                barcode,
                cost,
                price,
                stock
            };

            // Add stock history if stock changed
            if (oldStock !== stock) {
                this.addStockHistory(products[productIndex], oldStock, stock, 'Modification manuelle');
            }

            this.showToast('Produit modifié avec succès', 'success');
        } else {
            // Add new product
            const newProduct = {
                id: this.generateId(),
                name,
                barcode,
                cost,
                price,
                stock,
                createdAt: new Date().toISOString()
            };

            products.push(newProduct);

            // Add initial stock history
            if (stock > 0) {
                this.addStockHistory(newProduct, 0, stock, 'Stock initial');
            }

            this.showToast('Produit ajouté avec succès', 'success');
        }

        this.saveProducts(products);
        this.loadProducts();
        this.closeProductModal();
    }

    editProduct(productId) {
        this.openProductModal(productId);
    }

    deleteProduct(productId, productName) {
        this.currentDeleteId = productId;
        document.getElementById('delete-product-name').textContent = productName;
        document.getElementById('delete-modal').classList.remove('hidden');
    }

    closeDeleteModal() {
        document.getElementById('delete-modal').classList.add('hidden');
        this.currentDeleteId = null;
    }

    confirmDelete() {
        const products = this.getProducts();
        const productIndex = products.findIndex(p => p.id === this.currentDeleteId);
        
        if (productIndex !== -1) {
            const deletedProduct = products[productIndex];
            products.splice(productIndex, 1);
            
            this.saveProducts(products);
            this.loadProducts();
            
            // Add stock history for deletion
            this.addStockHistory(deletedProduct, deletedProduct.stock, 0, 'Suppression du produit');
            
            this.showToast('Produit supprimé avec succès', 'success');
        }

        this.closeDeleteModal();
    }

    // Stock history
    addStockHistory(product, oldStock, newStock, reason) {
        const stockHistory = JSON.parse(localStorage.getItem('stockHistory') || '[]');
        
        stockHistory.push({
            id: this.generateId(),
            timestamp: new Date().toISOString(),
            productName: product.name,
            barcode: product.barcode,
            oldStock: oldStock,
            newStock: newStock,
            variation: newStock - oldStock,
            reason: reason
        });

        localStorage.setItem('stockHistory', JSON.stringify(stockHistory));
    }

    // Validation
    validateBarcode(input) {
        const value = input.value;
        const isValid = /^\d*$/.test(value);
        
        if (!isValid && value) {
            input.style.borderColor = 'var(--color-danger)';
            this.showToast('Le code-barres doit contenir uniquement des chiffres', 'warning');
        } else {
            input.style.borderColor = '';
        }
    }

    updateBenefitPreview() {
        const cost = parseFloat(document.getElementById('product-cost').value) || 0;
        const price = parseFloat(document.getElementById('product-price').value) || 0;
        const benefit = price - cost;
        
        const benefitElement = document.getElementById('unit-benefit');
        benefitElement.textContent = `${benefit.toFixed(2)} DH`;
        
        if (benefit > 0) {
            benefitElement.style.color = 'var(--color-success)';
        } else if (benefit < 0) {
            benefitElement.style.color = 'var(--color-danger)';
        } else {
            benefitElement.style.color = 'var(--text-secondary)';
        }
    }

    // Utility functions
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type}`;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// Initialize admin app
const admin = new AdminApp();

// Make admin globally available for inline event handlers
window.admin = admin;