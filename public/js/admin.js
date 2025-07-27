// Lógica del panel de administración
class AdminManager {
    constructor() {
        this.currentEditingProduct = null;
        this.init();
    }
    
    async init() {
        // Verificar autenticación y permisos de admin
        if (!requireAuth() || !requireAdmin()) return;
        
        // Mostrar información del usuario
        this.displayUserInfo();
        
        // Cargar dashboard inicial
        await this.loadDashboard();
        
        // Configurar fecha de hoy por defecto
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('salesDate').value = today;
        document.getElementById('startDate').value = today;
        document.getElementById('endDate').value = today;
    }
    
    displayUserInfo() {
        const user = api.getCurrentUser();
        document.getElementById('adminWelcome').textContent = `Bienvenido, ${user.name} (Admin)`;
    }
    
    async loadDashboard() {
        try {
            // Cargar estadísticas del día
            const dailyReport = await api.getDailyReport();
            this.renderStats(dailyReport);
            this.renderTodaySales(dailyReport.sales);
            
            // Cargar productos más vendidos
            const today = new Date().toISOString().split('T')[0];
            const topProducts = await api.getTopProducts(today, today);
            this.renderTopProducts(topProducts.products);
            
        } catch (error) {
            showAlert('Error al cargar dashboard: ' + error.message, 'error');
        }
    }
    
    renderStats(report) {
        const statsGrid = document.getElementById('statsGrid');
        
        const stats = [
            {
                number: report.summary.total_sales || 0,
                label: 'Ventas Hoy',
                icon: '💰'
            },
            {
                number: formatCurrency(report.summary.total_amount || 0),
                label: 'Ingresos Hoy',
                icon: '💵'
            },
            {
                number: report.summary.total_items || 0,
                label: 'Productos Vendidos',
                icon: '📦'
            },
            {
                number: report.seller_stats?.length || 0,
                label: 'Vendedores Activos',
                icon: '👥'
            }
        ];
        
        statsGrid.innerHTML = stats.map(stat => `
            <div class="stat-card">
                <div class="stat-number">${stat.number}</div>
                <div class="stat-label">${stat.icon} ${stat.label}</div>
            </div>
        `).join('');
    }
    
    renderTodaySales(sales) {
        const container = document.getElementById('todaySales');
        
        if (!sales || sales.length === 0) {
            container.innerHTML = '<p class="text-center">No hay ventas registradas hoy</p>';
            return;
        }
        
        const recentSales = sales.slice(0, 5); // Mostrar solo las 5 más recientes
        
        container.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Hora</th>
                        <th>Vendedor</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${recentSales.map(sale => `
                        <tr>
                            <td>${formatDate(sale.created_at)}</td>
                            <td>${sale.seller_name}</td>
                            <td>${formatCurrency(sale.total_amount)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
    
    renderTopProducts(products) {
        const container = document.getElementById('topProducts');
        
        if (!products || products.length === 0) {
            container.innerHTML = '<p class="text-center">No hay datos de productos</p>';
            return;
        }
        
        container.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Producto</th>
                        <th>Vendidos</th>
                        <th>Ingresos</th>
                    </tr>
                </thead>
                <tbody>
                    ${products.slice(0, 5).map(product => `
                        <tr>
                            <td>${product.name}</td>
                            <td>${product.total_quantity}</td>
                            <td>${formatCurrency(product.total_revenue)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
    
    async loadProducts() {
        try {
            showLoading(document.getElementById('productsTable'));
            
            const response = await api.getProducts();
            this.renderProductsTable(response.products);
            
        } catch (error) {
            showAlert('Error al cargar productos: ' + error.message, 'error');
        }
    }
    
    renderProductsTable(products) {
        const container = document.getElementById('productsTable');
        
        if (!products || products.length === 0) {
            container.innerHTML = '<p class="text-center">No hay productos registrados</p>';
            return;
        }
        
        container.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Precio</th>
                        <th>Categoría</th>
                        <th>Estado</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${products.map(product => `
                        <tr>
                            <td>
                                <strong>${product.name}</strong><br>
                                <small>${product.description || 'Sin descripción'}</small>
                            </td>
                            <td>${formatCurrency(product.price)}</td>
                            <td>${product.category || 'Sin categoría'}</td>
                            <td>
                                <span class="${product.is_active ? 'text-success' : 'text-danger'}">
                                    ${product.is_active ? '✅ Activo' : '❌ Inactivo'}
                                </span>
                            </td>
                            <td>
                                <button class="btn btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.8rem; margin-right: 0.25rem;" 
                                        onclick="adminManager.editProduct('${product.id}')">
                                    ✏️ Editar
                                </button>
                                <button class="btn ${product.is_active ? 'btn-danger' : 'btn-success'}" 
                                        style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" 
                                        onclick="adminManager.toggleProductStatus('${product.id}', ${!product.is_active})">
                                    ${product.is_active ? '❌ Desactivar' : '✅ Activar'}
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
    
    async loadSales(date = null) {
        try {
            showLoading(document.getElementById('salesTable'));
            
            const response = await api.getDailySales(date);
            this.renderSalesTable(response.sales);
            
        } catch (error) {
            showAlert('Error al cargar ventas: ' + error.message, 'error');
        }
    }
    
    renderSalesTable(sales) {
        const container = document.getElementById('salesTable');
        
        if (!sales || sales.length === 0) {
            container.innerHTML = '<p class="text-center">No hay ventas para la fecha seleccionada</p>';
            return;
        }
        
        container.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Fecha/Hora</th>
                        <th>Vendedor</th>
                        <th>Productos</th>
                        <th>Total</th>
                        <th>Acciones</th>
                    </tr>
                </thead>
                <tbody>
                    ${sales.map(sale => `
                        <tr>
                            <td>${formatDate(sale.created_at)}</td>
                            <td>${sale.seller_name}</td>
                            <td>${sale.items?.length || 0} productos</td>
                            <td>${formatCurrency(sale.total_amount)}</td>
                            <td>
                                <button class="btn btn-secondary" style="padding: 0.25rem 0.5rem; font-size: 0.8rem;" 
                                        onclick="adminManager.viewSaleDetails('${sale.id}')">
                                    👁️ Ver Detalles
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
    
    async generateReport() {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        
        if (!startDate || !endDate) {
            showAlert('Por favor selecciona ambas fechas', 'error');
            return;
        }
        
        try {
            showLoading(document.getElementById('reportResults'));
            
            const [topProducts, sellerPerformance] = await Promise.all([
                api.getTopProducts(startDate, endDate),
                api.getSellerPerformance(startDate, endDate)
            ]);
            
            this.renderReportResults(topProducts, sellerPerformance, startDate, endDate);
            this.renderSellerPerformance(sellerPerformance.sellers);
            
        } catch (error) {
            showAlert('Error al generar reporte: ' + error.message, 'error');
        }
    }
    
    renderReportResults(topProducts, sellerPerformance, startDate, endDate) {
        const container = document.getElementById('reportResults');
        
        container.innerHTML = `
            <h4>📊 Reporte del ${startDate} al ${endDate}</h4>
            
            <div class="grid grid-2 mb-2">
                <div>
                    <h5>🏆 Top 5 Productos Más Vendidos</h5>
                    ${topProducts.products.length > 0 ? `
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Producto</th>
                                    <th>Cantidad</th>
                                    <th>Ingresos</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${topProducts.products.slice(0, 5).map(product => `
                                    <tr>
                                        <td>${product.name}</td>
                                        <td>${product.total_quantity}</td>
                                        <td>${formatCurrency(product.total_revenue)}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    ` : '<p>No hay datos de productos</p>'}
                </div>
                
                <div>
                    <h5>💰 Resumen Financiero</h5>
                    <div class="stat-card">
                        <div class="stat-number">${formatCurrency(sellerPerformance.summary.total_revenue || 0)}</div>
                        <div class="stat-label">Ingresos Totales</div>
                    </div>
                    <div class="stat-card" style="margin-top: 1rem;">
                        <div class="stat-number">${sellerPerformance.summary.total_sales || 0}</div>
                        <div class="stat-label">Ventas Totales</div>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderSellerPerformance(sellers) {
        const container = document.getElementById('sellerPerformance');
        
        if (!sellers || sellers.length === 0) {
            container.innerHTML = '<p class="text-center">No hay datos de vendedores</p>';
            return;
        }
        
        container.innerHTML = `
            <table class="table">
                <thead>
                    <tr>
                        <th>Vendedor</th>
                        <th>Ventas</th>
                        <th>Ingresos</th>
                    </tr>
                </thead>
                <tbody>
                    ${sellers.map(seller => `
                        <tr>
                            <td>${seller.seller_name}</td>
                            <td>${seller.total_sales}</td>
                            <td>${formatCurrency(seller.total_revenue)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }
    
    // Gestión de productos
    showProductModal(productId = null) {
        const modal = document.getElementById('productModal');
        const form = document.getElementById('productForm');
        const title = document.getElementById('modalTitle');
        
        if (productId) {
            // Modo edición
            title.textContent = 'Editar Producto';
            this.currentEditingProduct = productId;
            this.loadProductForEdit(productId);
        } else {
            // Modo creación
            title.textContent = 'Nuevo Producto';
            this.currentEditingProduct = null;
            form.reset();
        }
        
        modal.style.display = 'flex';
    }
    
    async loadProductForEdit(productId) {
        try {
            const response = await api.getProducts();
            const product = response.products.find(p => p.id === productId);
            
            if (product) {
                document.getElementById('productName').value = product.name;
                document.getElementById('productDescription').value = product.description || '';
                document.getElementById('productPrice').value = product.price;
                document.getElementById('productCategory').value = product.category || '';
            }
        } catch (error) {
            showAlert('Error al cargar producto: ' + error.message, 'error');
        }
    }
    
    closeProductModal() {
        document.getElementById('productModal').style.display = 'none';
        this.currentEditingProduct = null;
    }
    
    async saveProduct(formData) {
        try {
            if (this.currentEditingProduct) {
                // Actualizar producto existente
                await api.updateProduct(this.currentEditingProduct, formData);
                showAlert('Producto actualizado exitosamente', 'success');
            } else {
                // Crear nuevo producto
                await api.createProduct(formData);
                showAlert('Producto creado exitosamente', 'success');
            }
            
            this.closeProductModal();
            await this.loadProducts();
            
        } catch (error) {
            showAlert('Error al guardar producto: ' + error.message, 'error');
        }
    }
    
    async toggleProductStatus(productId, newStatus) {
        try {
            await api.updateProduct(productId, { is_active: newStatus });
            showAlert(`Producto ${newStatus ? 'activado' : 'desactivado'} exitosamente`, 'success');
            await this.loadProducts();
        } catch (error) {
            showAlert('Error al cambiar estado del producto: ' + error.message, 'error');
        }
    }
    
    editProduct(productId) {
        this.showProductModal(productId);
    }
    
    async viewSaleDetails(saleId) {
        try {
            const response = await api.getSaleDetails(saleId);
            const sale = response.sale;
            
            const detailsHTML = `
                <div class="modal-content">
                    <span class="close-btn" onclick="this.parentElement.parentElement.remove()">&times;</span>
                    <h3>Detalles de la Venta</h3>
                    <p><strong>ID:</strong> ${sale.id}</p>
                    <p><strong>Fecha:</strong> ${formatDate(sale.created_at)}</p>
                    <p><strong>Vendedor:</strong> ${sale.seller_name}</p>
                    <p><strong>Total:</strong> ${formatCurrency(sale.total_amount)}</p>
                    <h4>Productos:</h4>
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Producto</th>
                                <th>Cantidad</th>
                                <th>Precio Unit.</th>
                                <th>Subtotal</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sale.items.map(item => `
                                <tr>
                                    <td>${item.product_name}</td>
                                    <td>${item.quantity}</td>
                                    <td>${formatCurrency(item.unit_price)}</td>
                                    <td>${formatCurrency(item.quantity * item.unit_price)}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                    <button class="btn btn-secondary" onclick="this.parentElement.parentElement.remove()">Cerrar</button>
                </div>
            `;
            
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = detailsHTML;
            document.body.appendChild(modal);
            
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

// Funciones globales para el HTML
function showTab(tabName) {
    // Ocultar todas las pestañas
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remover clase active de todos los botones
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Mostrar pestaña seleccionada
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
    
    // Cargar contenido según la pestaña
    switch(tabName) {
        case 'dashboard':
            adminManager.loadDashboard();
            break;
        case 'products':
            adminManager.loadProducts();
            break;
        case 'sales':
            adminManager.loadSales();
            break;
        case 'reports':
            // Los reportes se cargan bajo demanda
            break;
    }
}

function showProductModal() {
    adminManager.showProductModal();
}

function closeProductModal() {
    adminManager.closeProductModal();
}

function loadSalesByDate() {
    const date = document.getElementById('salesDate').value;
    adminManager.loadSales(date);
}

function generateReport() {
    adminManager.generateReport();
}

// Manejar formulario de productos
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('productForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const formData = {
            name: document.getElementById('productName').value,
            description: document.getElementById('productDescription').value,
            price: parseFloat(document.getElementById('productPrice').value),
            category: document.getElementById('productCategory').value
        };
        
        await adminManager.saveProduct(formData);
    });
});

// Inicializar cuando se carga la página
let adminManager;
document.addEventListener('DOMContentLoaded', () => {
    adminManager = new AdminManager();
});