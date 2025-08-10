// ===== HISTORIQUE SCRIPT =====

class HistoriqueApp {
    constructor() {
        this.currentTab = 'sales';
        this.filteredSales = [];
        this.filteredStock = [];
        this.init();
    }

    init() {
        this.initTheme();
        this.bindEvents();
        this.loadStatistics();
        this.loadSalesHistory();
        this.loadStockHistory();
        this.setDefaultDates();
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

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Date filtering
        document.getElementById('filter-dates').addEventListener('click', () => {
            this.filterByDate();
        });

        document.getElementById('clear-filter').addEventListener('click', () => {
            this.clearDateFilter();
        });

        // Export Excel
        document.getElementById('export-excel').addEventListener('click', () => {
            this.exportToExcel();
        });

        // Sale detail modal
        document.getElementById('close-detail-modal').addEventListener('click', () => {
            this.closeSaleDetailModal();
        });

        document.getElementById('close-detail').addEventListener('click', () => {
            this.closeSaleDetailModal();
        });

        document.getElementById('print-receipt').addEventListener('click', () => {
            this.printReceipt();
        });
    }

    // Statistics
    loadStatistics() {
        const salesHistory = this.getSalesHistory();
        const products = this.getProducts();

        let totalSales = 0;
        let totalProfit = 0;
        let totalOrders = salesHistory.length;
        let totalProductsSold = 0;

        salesHistory.forEach(sale => {
            totalSales += sale.total;
            totalProfit += sale.benefit;
            totalProductsSold += sale.items.reduce((sum, item) => sum + item.quantity, 0);
        });

        document.getElementById('total-sales').textContent = `${totalSales.toFixed(2)} DH`;
        document.getElementById('total-profit').textContent = `${totalProfit.toFixed(2)} DH`;
        document.getElementById('total-orders').textContent = totalOrders;
        document.getElementById('products-sold').textContent = totalProductsSold;
    }

    // Data retrieval
    getSalesHistory() {
        return JSON.parse(localStorage.getItem('salesHistory') || '[]');
    }

    getStockHistory() {
        return JSON.parse(localStorage.getItem('stockHistory') || '[]');
    }

    getProducts() {
        return JSON.parse(localStorage.getItem('products') || '[]');
    }

    // Tab management
    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });
        document.getElementById(`${tabName}-tab`).classList.add('active');

        this.currentTab = tabName;
    }

    // Sales history
    loadSalesHistory() {
        const salesHistory = this.getSalesHistory();
        this.filteredSales = [...salesHistory].reverse(); // Most recent first
        this.displaySales();
    }

    displaySales() {
        const tbody = document.getElementById('sales-tbody');
        const noSales = document.getElementById('no-sales');

        if (this.filteredSales.length === 0) {
            tbody.innerHTML = '';
            noSales.style.display = 'block';
            return;
        }

        noSales.style.display = 'none';

        tbody.innerHTML = this.filteredSales.map(sale => {
            const date = new Date(sale.timestamp);
            const itemCount = sale.items.reduce((sum, item) => sum + item.quantity, 0);
            const itemsText = `${itemCount} article${itemCount > 1 ? 's' : ''}`;
            
            let paymentIcon = '';
            switch (sale.paymentMethod) {
                case 'cash':
                    paymentIcon = '<i class="fas fa-money-bill-wave"></i> Espèces';
                    break;
                case 'card':
                    paymentIcon = '<i class="fas fa-credit-card"></i> Carte';
                    break;
                case 'mobile':
                    paymentIcon = '<i class="fas fa-mobile-alt"></i> Mobile';
                    break;
            }

            return `
                <tr>
                    <td>${date.toLocaleDateString('fr-FR')}</td>
                    <td>${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>${itemsText}</td>
                    <td class="benefit-positive">${sale.total.toFixed(2)} DH</td>
                    <td class="benefit-positive">${sale.benefit.toFixed(2)} DH</td>
                    <td>${paymentIcon}</td>
                    <td>
                        <button class="action-btn edit-btn" onclick="historique.showSaleDetail('${sale.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    showSaleDetail(saleId) {
        const sale = this.getSalesHistory().find(s => s.id === saleId);
        if (!sale) return;

        const modal = document.getElementById('sale-detail-modal');
        const detailsContainer = document.getElementById('sale-details');

        const date = new Date(sale.timestamp);
        
        let paymentDetails = '';
        if (sale.paymentMethod === 'cash' && sale.paymentDetails) {
            paymentDetails = `
                <div class="payment-detail">
                    <span>Reçu: ${sale.paymentDetails.received.toFixed(2)} DH</span>
                    <span>Monnaie: ${sale.paymentDetails.change.toFixed(2)} DH</span>
                </div>
            `;
        }

        detailsContainer.innerHTML = `
            <div class="sale-header">
                <h4>Vente #${sale.id.substring(0, 8)}</h4>
                <p>${date.toLocaleDateString('fr-FR')} à ${date.toLocaleTimeString('fr-FR')}</p>
            </div>
            
            <div class="sale-items">
                <h5>Articles vendus:</h5>
                <table class="items-table">
                    <thead>
                        <tr>
                            <th>Produit</th>
                            <th>Qté</th>
                            <th>Prix unit.</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sale.items.map(item => `
                            <tr>
                                <td>${item.name}</td>
                                <td>${item.quantity}</td>
                                <td>${item.price.toFixed(2)} DH</td>
                                <td>${(item.price * item.quantity).toFixed(2)} DH</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            
            <div class="sale-summary">
                <div class="summary-row">
                    <span>Total:</span>
                    <span class="total-amount">${sale.total.toFixed(2)} DH</span>
                </div>
                <div class="summary-row">
                    <span>Bénéfice:</span>
                    <span class="benefit-amount">${sale.benefit.toFixed(2)} DH</span>
                </div>
                <div class="summary-row">
                    <span>Mode de paiement:</span>
                    <span>${this.getPaymentMethodText(sale.paymentMethod)}</span>
                </div>
                ${paymentDetails}
            </div>
        `;

        modal.classList.remove('hidden');
        this.currentSaleId = saleId;
    }

    closeSaleDetailModal() {
        document.getElementById('sale-detail-modal').classList.add('hidden');
        this.currentSaleId = null;
    }

    getPaymentMethodText(method) {
        switch (method) {
            case 'cash': return 'Espèces';
            case 'card': return 'Carte bancaire';
            case 'mobile': return 'Paiement mobile';
            default: return method;
        }
    }

    // Stock history
    clearAllHistory() {
        if (confirm("⚠️ Voulez-vous vraiment supprimer tout l'historique des ventes et du stock ?")) {
            localStorage.removeItem('salesHistory');
            localStorage.removeItem('stockHistory');
            this.loadSalesHistory();
            this.loadStockHistory();
            this.updateFilteredStatistics();
        }
    }

    loadStockHistory() {
        const stockHistory = this.getStockHistory();
        this.filteredStock = [...stockHistory].reverse(); // Most recent first
        this.displayStockHistory();
    }

    displayStockHistory() {
        const tbody = document.getElementById('stock-tbody');
        const noStock = document.getElementById('no-stock');

        if (this.filteredStock.length === 0) {
            tbody.innerHTML = '';
            noStock.style.display = 'block';
            return;
        }

        noStock.style.display = 'none';

        tbody.innerHTML = this.filteredStock.map(movement => {
            const date = new Date(movement.timestamp);
            const variationClass = movement.variation > 0 ? 'variation-positive' : 'variation-negative';
            const variationText = movement.variation > 0 ? `+${movement.variation}` : movement.variation;

            return `
                <tr>
                    <td>${date.toLocaleDateString('fr-FR')}</td>
                    <td>${date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td>${movement.productName}</td>
                    <td>${movement.oldStock}</td>
                    <td>${movement.newStock}</td>
                    <td class="${variationClass}">${variationText}</td>
                    <td>${movement.reason}</td>
                </tr>
            `;
        }).join('');
    }

    // Date filtering
    setDefaultDates() {
        const today = new Date();
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);

        document.getElementById('date-from').value = monthAgo.toISOString().split('T')[0];
        document.getElementById('date-to').value = today.toISOString().split('T')[0];
    }

    filterByDate() {
        const dateFrom = document.getElementById('date-from').value;
        const dateTo = document.getElementById('date-to').value;

        if (!dateFrom || !dateTo) {
            this.showToast('Veuillez sélectionner les deux dates', 'warning');
            return;
        }

        const fromDate = new Date(dateFrom);
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999); // Include end of day

        // Filter sales
        const allSales = this.getSalesHistory();
        this.filteredSales = allSales.filter(sale => {
            const saleDate = new Date(sale.timestamp);
            return saleDate >= fromDate && saleDate <= toDate;
        }).reverse();

        // Filter stock movements
        const allStock = this.getStockHistory();
        this.filteredStock = allStock.filter(movement => {
            const movementDate = new Date(movement.timestamp);
            return movementDate >= fromDate && movementDate <= toDate;
        }).reverse();

        this.displaySales();
        this.displayStockHistory();
        this.updateFilteredStatistics();

        this.showToast(`Filtre appliqué: ${this.filteredSales.length} ventes trouvées`, 'success');
    }

    clearDateFilter() {
        this.loadSalesHistory();
        this.loadStockHistory();
        this.loadStatistics();
        this.setDefaultDates();
        this.showToast('Filtre supprimé', 'info');
    }

    updateFilteredStatistics() {
        let totalSales = 0;
        let totalProfit = 0;
        let totalOrders = this.filteredSales.length;
        let totalProductsSold = 0;

        this.filteredSales.forEach(sale => {
            totalSales += sale.total;
            totalProfit += sale.benefit;
            totalProductsSold += sale.items.reduce((sum, item) => sum + item.quantity, 0);
        });

        document.getElementById('total-sales').textContent = `${totalSales.toFixed(2)} DH`;
        document.getElementById('total-profit').textContent = `${totalProfit.toFixed(2)} DH`;
        document.getElementById('total-orders').textContent = totalOrders;
        document.getElementById('products-sold').textContent = totalProductsSold;
    }

    // Excel export
    exportToExcel() {
        if (!window.XLSX) {
            this.showToast('Erreur: Librairie Excel non chargée', 'error');
            return;
        }

        const wb = XLSX.utils.book_new();

        // Export sales data
        if (this.filteredSales.length > 0) {
            const salesData = this.filteredSales.map(sale => {
                const date = new Date(sale.timestamp);
                return {
                    'Date': date.toLocaleDateString('fr-FR'),
                    'Heure': date.toLocaleTimeString('fr-FR'),
                    'Articles': sale.items.reduce((sum, item) => sum + item.quantity, 0),
                    'Total (DH)': sale.total.toFixed(2),
                    'Bénéfice (DH)': sale.benefit.toFixed(2),
                    'Paiement': this.getPaymentMethodText(sale.paymentMethod),
                    'Détails': sale.items.map(item => `${item.name} x${item.quantity}`).join('; ')
                };
            });

            const salesWs = XLSX.utils.json_to_sheet(salesData);
            XLSX.utils.book_append_sheet(wb, salesWs, "Ventes");
        }

        // Export stock movements
        if (this.filteredStock.length > 0) {
            const stockData = this.filteredStock.map(movement => {
                const date = new Date(movement.timestamp);
                return {
                    'Date': date.toLocaleDateString('fr-FR'),
                    'Heure': date.toLocaleTimeString('fr-FR'),
                    'Produit': movement.productName,
                    'Code-barres': movement.barcode,
                    'Ancien stock': movement.oldStock,
                    'Nouveau stock': movement.newStock,
                    'Variation': movement.variation,
                    'Motif': movement.reason
                };
            });

            const stockWs = XLSX.utils.json_to_sheet(stockData);
            XLSX.utils.book_append_sheet(wb, stockWs, "Mouvements Stock");
        }

        // Export statistics
        const stats = [{
            'Indicateur': 'Chiffre d\'affaires',
            'Valeur': document.getElementById('total-sales').textContent
        }, {
            'Indicateur': 'Bénéfices totaux',
            'Valeur': document.getElementById('total-profit').textContent
        }, {
            'Indicateur': 'Nombre de ventes',
            'Valeur': document.getElementById('total-orders').textContent
        }, {
            'Indicateur': 'Produits vendus',
            'Valeur': document.getElementById('products-sold').textContent
        }];

        const statsWs = XLSX.utils.json_to_sheet(stats);
        XLSX.utils.book_append_sheet(wb, statsWs, "Statistiques");

        // Generate filename with date range
        const dateFrom = document.getElementById('date-from').value;
        const dateTo = document.getElementById('date-to').value;
        const filename = `caisse_export_${dateFrom}_${dateTo}.xlsx`;

        XLSX.writeFile(wb, filename);
        this.showToast('Export Excel terminé', 'success');
    }

    // Print receipt
    printReceipt() {
        const sale = this.getSalesHistory().find(s => s.id === this.currentSaleId);
        if (!sale) return;

        const printWindow = window.open('', '_blank');
        const date = new Date(sale.timestamp);

        const receiptHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Reçu de vente</title>
                <style>
                    body { font-family: monospace; font-size: 12px; margin: 0; padding: 20px; }
                    .header { text-align: center; margin-bottom: 20px; }
                    .line { border-bottom: 1px dashed #000; margin: 10px 0; }
                    .item { display: flex; justify-content: space-between; margin: 5px 0; }
                    .total { font-weight: bold; margin-top: 10px; }
                    .footer { text-align: center; margin-top: 20px; font-size: 10px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>CAISSE</h2>
                    <p>Reçu #${sale.id.substring(0, 8)}</p>
                    <p>${date.toLocaleDateString('fr-FR')} ${date.toLocaleTimeString('fr-FR')}</p>
                </div>
                
                <div class="line"></div>
                
                <div class="items">
                    ${sale.items.map(item => `
                        <div class="item">
                            <span>${item.name}</span>
                            <span>${item.quantity} x ${item.price.toFixed(2)}</span>
                            <span>${(item.price * item.quantity).toFixed(2)} DH</span>
                        </div>
                    `).join('')}
                </div>
                
                <div class="line"></div>
                
                <div class="total">
                    <div class="item">
                        <span>TOTAL:</span>
                        <span>${sale.total.toFixed(2)} DH</span>
                    </div>
                    <div class="item">
                        <span>PAIEMENT:</span>
                        <span>${this.getPaymentMethodText(sale.paymentMethod)}</span>
                    </div>
                    ${sale.paymentMethod === 'cash' && sale.paymentDetails ? `
                        <div class="item">
                            <span>REÇU:</span>
                            <span>${sale.paymentDetails.received.toFixed(2)} DH</span>
                        </div>
                        <div class="item">
                            <span>MONNAIE:</span>
                            <span>${sale.paymentDetails.change.toFixed(2)} DH</span>
                        </div>
                    ` : ''}
                </div>
                
                <div class="footer">
                    <p>Merci de votre visite !</p>
                </div>
            </body>
            </html>
        `;

        printWindow.document.write(receiptHTML);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
    }

    // Utility functions
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

// Initialize historique app
const historique = new HistoriqueApp();

// Make historique globally available for inline event handlers
window.historique = historique;
// Initialize historique app
const historique = new HistoriqueApp();

// Make historique globally available for inline event handlers
window.historique = historique;
