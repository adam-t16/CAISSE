// ===== MAIN CAISSE SCRIPT =====

class CaisseApp {
    constructor() {
        this.cart = [];
        this.scanner = null;
        this.isScanning = false;
        
        this.init();
    }

    init() {
        this.initTheme();
        this.bindEvents();
        this.updateCartDisplay();
        this.loadCartFromStorage();
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

        // Manual barcode input
        document.getElementById('manual-add').addEventListener('click', () => {
            this.handleManualInput();
        });

        // Enter key on barcode input
        document.getElementById('barcode-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleManualInput();
            }
        });

        // Camera scan
        document.getElementById('camera-scan').addEventListener('click', () => {
            this.toggleScanner();
        });

        document.getElementById('stop-scan').addEventListener('click', () => {
            this.stopScanner();
        });

        // Checkout
        document.getElementById('checkout-btn').addEventListener('click', () => {
            this.openPaymentModal();
        });

        // Payment modal
        document.getElementById('close-modal').addEventListener('click', () => {
            this.closePaymentModal();
        });

        document.getElementById('cancel-payment').addEventListener('click', () => {
            this.closePaymentModal();
        });

        document.getElementById('confirm-payment').addEventListener('click', () => {
            this.processPayment();
        });

        // Payment method change
        document.getElementById('payment-method').addEventListener('change', (e) => {
            this.updatePaymentUI(e.target.value);
        });

        // Cash received input
        document.getElementById('cash-received').addEventListener('input', () => {
            this.calculateChange();
        });

        // Auto-save cart
        window.addEventListener('beforeunload', () => {
            this.saveCartToStorage();
        });
    }

    // Product management
    getProducts() {
        return JSON.parse(localStorage.getItem('products') || '[]');
    }

    findProductByBarcode(barcode) {
        const products = this.getProducts();
        return products.find(product => product.barcode === barcode);
    }

    // Manual input handling
    handleManualInput() {
        const barcodeInput = document.getElementById('barcode-input');
        const barcode = barcodeInput.value.trim();

        if (!barcode) {
            this.showToast('Veuillez saisir un code-barres', 'warning');
            return;
        }

        this.addProductToCart(barcode);
        barcodeInput.value = '';
    }

    // Scanner management
    async toggleScanner() {
        if (this.isScanning) {
            this.stopScanner();
        } else {
            await this.startScanner();
        }
    }

    async startScanner() {
        const scannerContainer = document.getElementById('scanner-container');
        const cameraScanBtn = document.getElementById('camera-scan');

        try {
            scannerContainer.classList.remove('hidden');
            cameraScanBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Démarrage...';
            cameraScanBtn.disabled = true;

            // Initialize Html5Qrcode scanner
            this.scanner = new Html5Qrcode("reader");

            const config = {
                fps: 10,
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            };

            await this.scanner.start(
                { facingMode: "environment" }, // Use back camera
                config,
                (decodedText) => {
                    this.handleScanSuccess(decodedText);
                },
                (error) => {
                    // Handle scan errors silently
                    console.log('Scan error:', error);
                }
            );

            this.isScanning = true;
            cameraScanBtn.innerHTML = '<i class="fas fa-camera"></i> Scanner actif';
            this.showToast('Scanner démarré', 'success');

        } catch (error) {
            console.error('Erreur scanner:', error);
            this.showToast('Impossible d\'accéder à la caméra', 'error');
            scannerContainer.classList.add('hidden');
            cameraScanBtn.innerHTML = '<i class="fas fa-camera"></i> Scanner avec caméra';
            cameraScanBtn.disabled = false;
        }
    }

    async stopScanner() {
        const scannerContainer = document.getElementById('scanner-container');
        const cameraScanBtn = document.getElementById('camera-scan');

        if (this.scanner && this.isScanning) {
            try {
                await this.scanner.stop();
                this.scanner.clear();
                this.scanner = null;
            } catch (error) {
                console.error('Erreur arrêt scanner:', error);
            }
        }

        this.isScanning = false;
        scannerContainer.classList.add('hidden');
        cameraScanBtn.innerHTML = '<i class="fas fa-camera"></i> Scanner avec caméra';
        cameraScanBtn.disabled = false;
        
        this.showToast('Scanner arrêté', 'info');
    }

    handleScanSuccess(decodedText) {
        // Stop scanner after successful scan
        this.stopScanner();
        
        // Add product to cart
        this.addProductToCart(decodedText);
        
        // Update barcode input field
        document.getElementById('barcode-input').value = decodedText;
    }

    // Cart management
    addProductToCart(barcode) {
        const product = this.findProductByBarcode(barcode);

        if (!product) {
            this.showToast('Produit introuvable', 'error');
            return;
        }

        if (product.stock <= 0) {
            this.showToast('Produit en rupture de stock', 'warning');
            return;
        }

        // Check if product already in cart
        const existingItem = this.cart.find(item => item.barcode === barcode);
        
        if (existingItem) {
            if (existingItem.quantity < product.stock) {
                existingItem.quantity++;
                this.showToast(`Quantité mise à jour: ${product.name}`, 'success');
            } else {
                this.showToast('Stock insuffisant', 'warning');
                return;
            }
        } else {
            this.cart.push({
                barcode: product.barcode,
                name: product.name,
                price: product.price,
                cost: product.cost,
                quantity: 1,
                stock: product.stock
            });
            this.showToast(`Produit ajouté: ${product.name}`, 'success');
        }

        this.updateCartDisplay();
        this.saveCartToStorage();
    }

    updateItemQuantity(barcode, change) {
        const item = this.cart.find(item => item.barcode === barcode);
        
        if (!item) return;

        const newQuantity = item.quantity + change;
        
        if (newQuantity <= 0) {
            this.removeItemFromCart(barcode);
            return;
        }

        if (newQuantity > item.stock) {
            this.showToast('Stock insuffisant', 'warning');
            return;
        }

        item.quantity = newQuantity;
        this.updateCartDisplay();
        this.saveCartToStorage();
    }

    removeItemFromCart(barcode) {
        this.cart = this.cart.filter(item => item.barcode !== barcode);
        this.updateCartDisplay();
        this.saveCartToStorage();
        this.showToast('Produit retiré du panier', 'info');
    }

    clearCart() {
        this.cart = [];
        this.updateCartDisplay();
        this.saveCartToStorage();
    }

    // Cart display
    updateCartDisplay() {
        const cartItems = document.getElementById('cart-items');
        const cartCount = document.getElementById('cart-count');
        const cartTotal = document.getElementById('cart-total');
        const cartBenefit = document.getElementById('cart-benefit');
        const checkoutBtn = document.getElementById('checkout-btn');

        if (this.cart.length === 0) {
            cartItems.innerHTML = `
                <div class="empty-cart">
                    <i class="fas fa-shopping-cart empty-icon"></i>
                    <p>Votre panier est vide</p>
                </div>
            `;
            cartCount.textContent = '0';
            cartTotal.textContent = '0.00 DH';
            cartBenefit.textContent = '0.00 DH';
            checkoutBtn.disabled = true;
            return;
        }

        const totalAmount = this.calculateTotal();
        const totalBenefit = this.calculateBenefit();
        const totalItems = this.cart.reduce((sum, item) => sum + item.quantity, 0);

        cartItems.innerHTML = this.cart.map(item => {
            const itemTotal = item.price * item.quantity;
            return `
                <div class="cart-item">
                    <div class="cart-item-info">
                        <h4>${item.name}</h4>
                        <p>${item.price.toFixed(2)} DH × ${item.quantity}</p>
                    </div>
                    <div class="cart-item-controls">
                        <div class="quantity-controls">
                            <button class="quantity-btn" onclick="caisse.updateItemQuantity('${item.barcode}', -1)">
                                <i class="fas fa-minus"></i>
                            </button>
                            <span class="quantity">${item.quantity}</span>
                            <button class="quantity-btn" onclick="caisse.updateItemQuantity('${item.barcode}', 1)">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                        <div class="item-total">${itemTotal.toFixed(2)} DH</div>
                        <button class="remove-btn" onclick="caisse.removeItemFromCart('${item.barcode}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        cartCount.textContent = totalItems;
        cartTotal.textContent = `${totalAmount.toFixed(2)} DH`;
        cartBenefit.textContent = `${totalBenefit.toFixed(2)} DH`;
        checkoutBtn.disabled = false;
    }

    calculateTotal() {
        return this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    calculateBenefit() {
        return this.cart.reduce((sum, item) => sum + ((item.price - item.cost) * item.quantity), 0);
    }

    // Cart persistence
    saveCartToStorage() {
        localStorage.setItem('currentCart', JSON.stringify(this.cart));
    }

    loadCartFromStorage() {
        const savedCart = localStorage.getItem('currentCart');
        if (savedCart) {
            this.cart = JSON.parse(savedCart);
            this.updateCartDisplay();
        }
    }

    // Payment modal
    openPaymentModal() {
        const modal = document.getElementById('payment-modal');
        const paymentTotal = document.getElementById('payment-total');
        const paymentBenefit = document.getElementById('payment-benefit');
        const cashReceived = document.getElementById('cash-received');

        const total = this.calculateTotal();
        const benefit = this.calculateBenefit();

        paymentTotal.textContent = `${total.toFixed(2)} DH`;
        paymentBenefit.textContent = `${benefit.toFixed(2)} DH`;
        cashReceived.value = total.toFixed(2);

        this.updatePaymentUI('cash');
        this.calculateChange();

        modal.classList.remove('hidden');
    }

    closePaymentModal() {
        const modal = document.getElementById('payment-modal');
        modal.classList.add('hidden');
    }

    updatePaymentUI(method) {
        const cashPayment = document.getElementById('cash-payment');
        
        if (method === 'cash') {
            cashPayment.style.display = 'block';
        } else {
            cashPayment.style.display = 'none';
        }
    }

    calculateChange() {
        const total = this.calculateTotal();
        const received = parseFloat(document.getElementById('cash-received').value) || 0;
        const change = received - total;
        
        const changeAmount = document.getElementById('change-amount');
        changeAmount.textContent = `${change.toFixed(2)} DH`;
        
        if (change < 0) {
            changeAmount.style.color = 'var(--color-danger)';
        } else {
            changeAmount.style.color = 'var(--color-success)';
        }
    }

    // Payment processing
    processPayment() {
        const paymentMethod = document.getElementById('payment-method').value;
        const total = this.calculateTotal();
        const benefit = this.calculateBenefit();

        // Validate cash payment
        if (paymentMethod === 'cash') {
            const received = parseFloat(document.getElementById('cash-received').value) || 0;
            if (received < total) {
                this.showToast('Montant insuffisant', 'error');
                return;
            }
        }

        // Create sale record
        const sale = {
            id: this.generateId(),
            timestamp: new Date().toISOString(),
            items: [...this.cart],
            total: total,
            benefit: benefit,
            paymentMethod: paymentMethod,
            paymentDetails: paymentMethod === 'cash' ? {
                received: parseFloat(document.getElementById('cash-received').value),
                change: parseFloat(document.getElementById('cash-received').value) - total
            } : {}
        };

        // Save sale
        this.saveSale(sale);

        // Update stock
        this.updateStock();

        // Clear cart
        this.clearCart();

        // Close modal
        this.closePaymentModal();

        // Show success
        this.showToast('Vente enregistrée avec succès', 'success');

        // Remove cart from storage
        localStorage.removeItem('currentCart');
    }

    saveSale(sale) {
        const salesHistory = JSON.parse(localStorage.getItem('salesHistory') || '[]');
        salesHistory.push(sale);
        localStorage.setItem('salesHistory', JSON.stringify(salesHistory));
    }

    updateStock() {
        const products = this.getProducts();
        const stockHistory = JSON.parse(localStorage.getItem('stockHistory') || '[]');

        this.cart.forEach(cartItem => {
            const product = products.find(p => p.barcode === cartItem.barcode);
            if (product) {
                const oldStock = product.stock;
                const newStock = oldStock - cartItem.quantity;
                
                product.stock = Math.max(0, newStock);

                // Add stock history entry
                stockHistory.push({
                    id: this.generateId(),
                    timestamp: new Date().toISOString(),
                    productName: product.name,
                    barcode: product.barcode,
                    oldStock: oldStock,
                    newStock: product.stock,
                    variation: -cartItem.quantity,
                    reason: 'Vente'
                });
            }
        });

        localStorage.setItem('products', JSON.stringify(products));
        localStorage.setItem('stockHistory', JSON.stringify(stockHistory));
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

// Initialize app
const caisse = new CaisseApp();

// Make caisse globally available for inline event handlers
window.caisse = caisse;