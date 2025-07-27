const { db } = require('../config/firebase');

// Productos de ejemplo para el restaurante
const sampleProducts = [
    {
        name: 'Hamburguesa Clásica',
        description: 'Hamburguesa con carne, lechuga, tomate y queso',
        price: 12.50,
        category: 'hamburguesas',
        image: ''
    },
    {
        name: 'Pizza Margherita',
        description: 'Pizza con salsa de tomate, mozzarella y albahaca',
        price: 18.00,
        category: 'pizzas',
        image: ''
    },
    {
        name: 'Ensalada César',
        description: 'Lechuga, pollo, crutones y aderezo césar',
        price: 10.00,
        category: 'ensaladas',
        image: ''
    },
    {
        name: 'Refresco Cola',
        description: 'Bebida gaseosa 350ml',
        price: 2.50,
        category: 'bebidas',
        image: ''
    },
    {
        name: 'Agua Natural',
        description: 'Agua embotellada 500ml',
        price: 1.50,
        category: 'bebidas',
        image: ''
    },
    {
        name: 'Papas Fritas',
        description: 'Porción de papas fritas crujientes',
        price: 5.00,
        category: 'acompañamientos',
        image: ''
    }
];

async function seedProducts() {
    try {
        console.log('🌱 Creando productos de ejemplo...');
        
        for (const product of sampleProducts) {
            const productRef = await db.collection('products').add({
                ...product,
                active: true,
                createdAt: new Date(),
                createdBy: 'system',
                updatedAt: new Date()
            });
            
            console.log(`✅ Producto creado: ${product.name} (ID: ${productRef.id})`);
        }
        
        console.log('🎉 Todos los productos fueron creados exitosamente');
        
    } catch (error) {
        console.error('❌ Error creando productos:', error);
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    seedProducts().then(() => {
        console.log('🏁 Script completado');
        process.exit(0);
    }).catch(error => {
        console.error('💥 Error en script:', error);
        process.exit(1);
    });
}

module.exports = { seedProducts };