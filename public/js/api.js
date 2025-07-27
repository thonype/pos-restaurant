// API para comunicación con el backend
class API {
    constructor() {
        this.baseURL = window.location.origin; // http://localhost:3000
        this.token = localStorage.getItem('token');
    }

    // Configurar headers para las peticiones
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        return headers;
    }

    // Método genérico para hacer peticiones
    async request(endpoint, options = {}) {
        try {
            const url = `${this.baseURL}${endpoint}`;
            const config = {
                headers: this.getHeaders(),
                ...options
            };

            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Error en la petición');
            }

            return data;
        } catch (error) {
            console.error('Error en API:', error);
            throw error;
        }
    }

    // Métodos de autenticación
    async login(email, password) {
        const response = await this.request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        if (response.token) {
            this.token = response.token;
            localStorage.setItem('token', this.token);
            localStorage.setItem('user', JSON.stringify(response.user));
        }
        
        return response;
    }

    logout() {
        this.token = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login.html';
    }

    // Verificar si el usuario está autenticado
    isAuthenticated() {
        return !!this.token;
    }

    // Obtener usuario actual
    getCurrentUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    }

    // Métodos de productos
    async getProducts() {
        return await this.request('/api/products');
    }

    async createProduct(productData) {
        return await this.request('/api/products', {
            method: 'POST',
            body: JSON.stringify(productData)
        });
    }

    async updateProduct(productId, productData) {
        return await this.request(`/api/products/${productId}`, {
            method: 'PUT',
            body: JSON.stringify(productData)
        });
    }

    // Métodos de ventas
    async createSale(saleData) {
        return await this.request('/api/sales', {
            method: 'POST',
            body: JSON.stringify(saleData)
        });
    }

    async getDailySales(date = null) {
        const endpoint = date ? `/api/sales/daily?date=${date}` : '/api/sales/daily';
        return await this.request(endpoint);
    }

    async getSaleDetails(saleId) {
        return await this.request(`/api/sales/${saleId}`);
    }

    // Métodos de reportes (solo admin)
    async getDailyReport(date = null) {
        const endpoint = date ? `/api/reports/daily?date=${date}` : '/api/reports/daily';
        return await this.request(endpoint);
    }

    async getTopProducts(startDate, endDate) {
        return await this.request(`/api/reports/top-products?start_date=${startDate}&end_date=${endDate}`);
    }

    async getSellerPerformance(startDate, endDate) {
        return await this.request(`/api/reports/seller-performance?start_date=${startDate}&end_date=${endDate}`);
    }
}

// Crear instancia global de la API
const api = new API();

// Funciones de utilidad
function formatCurrency(amount) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(amount);
}

function formatDate(date) {
    return new Intl.DateTimeFormat('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }).format(new Date(date));
}

function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;
    
    // Buscar el contenedor apropiado
    let container = document.querySelector('.container');
    if (!container) {
        // Si no hay .container, usar el body
        container = document.body;
    }
    
    // Insertar al inicio del container
    if (container.firstChild) {
        container.insertBefore(alertDiv, container.firstChild);
    } else {
        container.appendChild(alertDiv);
    }
    
    // Remover después de 5 segundos
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

function showLoading(element) {
    element.innerHTML = `
        <div class="loading">
            <div class="spinner"></div>
            <p>Cargando...</p>
        </div>
    `;
}

// Verificar autenticación en páginas protegidas
function requireAuth() {
    if (!api.isAuthenticated()) {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

// Verificar si es admin
function requireAdmin() {
    const user = api.getCurrentUser();
    if (!user || user.role !== 'admin') {
        showAlert('No tienes permisos para acceder a esta sección', 'error');
        return false;
    }
    return true;
}