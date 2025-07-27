// Lógica del panel de ventas
class SalesManager {
    constructor() {
        this.products = [];
        this.cart = [];
        this.init();
    }
    
    async init() {
        // Verificar autenticación
        if (!requireAuth()) return;
        
        // Mostrar información del usuario
        this.displayUserInfo();
        
        // Cargar productos
        await this.loadProducts();
        
        // Cargar historial de ventas
        await this.loadSalesHistory();
    }
    
    displayUserInfo() {
        const user = api.getCurrentUser();
        const welcomeElement = document.getElementById('userWelcome');
        welcomeElement.textContent = `Bienvenido, ${user.name}`;
    }
    
    async loadProducts() {
        try {
            showLoading(document.getElementById('productsGrid'));
            
            const response = await api.getProducts();
            this.products = response.products;
            
            this.renderProducts();
        } catch (error) {
            showAlert('Error al cargar productos: ' + error.message, 'error');
        }
    }
    
    renderProducts() {
        const grid = document.getElementById('productsGrid');
        
        if (this.products.length === 0) {
            grid.innerHTML = '<p class="text-center">No hay productos disponibles</p>';
            return;
        }
        
        grid.innerHTML = this.products.map(product => `
            <div class="product-card" onclick="salesManager.addToCart('${product.id}')">
                <div class="product-name">${product.name}</div>
                <div class="product-price">${formatCurrency(product.price)}</div>
                <p style="font-size: 0.9rem; color: #666; margin-top: 0.5rem;">
                    ${product.description || 'Sin descripción'}
                </p>
            </div>
        `).join('');
    }
    
    addToCart(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;
        
        // Verificar si el producto ya está en el carrito
        const existingItem = this.cart.find(item => item.id === productId);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            this.cart.push({
                id: product.id,
                name: product.name,
                price: product.price,
                quantity: 1
            });
        }
        
        this.renderCart();
        this.updateTotal();
    }
    
    removeFromCart(productId) {
        this.cart = this.cart.filter(item => item.id !== productId);
        this.renderCart();
        this.updateTotal();
    }
    
    updateQuantity(productId, newQuantity) {
        if (newQuantity <= 0) {
            this.removeFromCart(productId);
            return;
        }
        
        const item = this.cart.find(item => item.id === productId);
        if (item) {
            item.quantity = newQuantity;
            this.renderCart();
            this.updateTotal();
        }
    }
    
    renderCart() {
        const cartElement = document.getElementById('cart');
        const processBtn = document.getElementById('processBtn');
        
        if (this.cart.length === 0) {
            cartElement.innerHTML = '<p class="text-center">No hay productos en el carrito</p>';
            processBtn.disabled = true;
            return;
        }
        
        processBtn.disabled = false;
        
        cartElement.innerHTML = this.cart.map(item => `
            <div class="cart-item">
                <div>
                    <strong>${item.name}</strong><br>
                    <small>${formatCurrency(item.price)} c/u</small>
                </div>
                <div class="flex align-center gap-1">
                    <button class="btn btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" 
                            onclick="salesManager.updateQuantity('${item.id}', ${item.quantity - 1})">
                        -
                    </button>
                    <span style="margin: 0 0.5rem; font-weight: bold;">${item.quantity}</span>
                    <button class="btn btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" 
                            onclick="salesManager.updateQuantity('${item.id}', ${item.quantity + 1})">
                        +
                    </button>
                    <button class="btn btn-danger" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; margin-left: 0.5rem;" 
                            onclick="salesManager.removeFromCart('${item.id}')">
                        🗑️
                    </button>
                </div>
            </div>
        `).join('');
    }
    
    updateTotal() {
        const total = this.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        document.getElementById('cartTotal').textContent = `Total: ${formatCurrency(total)}`;
    }
    
    clearCart() {
        this.cart = [];
        this.renderCart();
        this.updateTotal();
    }
    
    async processSale() {
        if (this.cart.length === 0) {
            showAlert('El carrito está vacío', 'error');
            return;
        }
        
        const processBtn = document.getElementById('processBtn');
        processBtn.disabled = true;
        processBtn.textContent = 'Procesando...';
        
        try {
            const saleData = {
                items: this.cart.map(item => ({
                    product_id: item.id,
                    quantity: item.quantity,
                    unit_price: item.price
                }))
            };
            
            const response = await api.createSale(saleData);
            
            showAlert(`¡Venta procesada exitosamente! Total: ${formatCurrency(response.sale.total_amount)}`, 'success');
            
            // Limpiar carrito
            this.clearCart();
            
            // Recargar historial
            await this.loadSalesHistory();
            
        } catch (error) {
            showAlert('Error al procesar la venta: ' + error.message, 'error');
        } finally {
            processBtn.disabled = false;
            processBtn.textContent = '💳 Procesar Venta';
        }
    }
    
    async loadSalesHistory() {
        try {
            const response = await api.getDailySales();
            this.renderSalesHistory(response.sales);
        } catch (error) {
            console.error('Error al cargar historial:', error);
        }
    }
    
    renderSalesHistory(sales) {
        const historyElement = document.getElementById('salesHistory');
        
        if (!sales || sales.length === 0) {
            historyElement.innerHTML = '<p class="text-center">No hay ventas registradas hoy</p>';
            return;
        }
        
        const tableHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Hora</th>
                        <th>Productos</th>
                        <th>Total</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${sales.map(sale => `
                        <tr>
                            <td>${formatDate(sale.created_at)}</td>
                            <td>${sale.items?.length || 0} productos</td>
                            <td>${formatCurrency(sale.total_amount)}</td>
                            <td>
                                <button class="btn btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" 
                                        onclick="salesManager.viewSaleDetails('${sale.id}')">
                                    Ver Detalles
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
        
        historyElement.innerHTML = tableHTML;
    }
    
    async viewSaleDetails(saleId) {
        try {
            const response = await api.getSaleDetails(saleId);
            const sale = response.sale;
            
            const detailsHTML = `
                <div style="background: white; padding: 2rem; border-radius: 10px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                    <h3>Detalles de la Venta</h3>
                    <p><strong>Fecha:</strong> ${formatDate(sale.created_at)}</p>
                    <p><strong>Total:</strong> ${formatCurrency(sale.total_amount)}</p>
                    <h4>Productos:</h4>
                    <ul>
                        ${sale.items.map(item => `
                            <li>${item.product_name} - Cantidad: ${item.quantity} - Precio: ${formatCurrency(item.unit_price)}</li>
                        `).join('')}
                    </ul>
                    <button class="btn btn-secondary" onclick="this.parentElement.remove()">Cerrar</button>
                </div>
            `;
            
            // Crear modal simple
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
            `;
            modal.innerHTML = detailsHTML;
            
            document.body.appendChild(modal);
            
            // Cerrar al hacer clic fuera
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                }
            });
            
        } catch (error) {
            showAlert('Error al cargar detalles: ' + error.message, 'error');
        }
    }
}

// Funciones globales
function processSale() {
    salesManager.processSale();
}

function clearCart() {
    salesManager.clearCart();
}

// Inicializar cuando se carga la página
let salesManager;
document.addEventListener('DOMContentLoaded', () => {
    salesManager = new SalesManager();
});