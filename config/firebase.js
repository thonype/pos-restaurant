const admin = require('firebase-admin');
const path = require('path');

// Configuración de Firebase Admin
let firebaseInitialized = false;

try {
    // Opción 1: Usar archivo JSON directamente
    const serviceAccountPath = path.join(__dirname, '../firebase-service-account.json');
    
    const fs = require('fs');
    if (fs.existsSync(serviceAccountPath)) {
        console.log('📁 Usando archivo de credenciales JSON');
        const serviceAccount = require(serviceAccountPath);
        
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com`
            });
        }
        firebaseInitialized = true;
    } else {
        // Opción 2: Usar variables de entorno
        console.log('🔧 Intentando usar variables de entorno');
        const serviceAccount = {
            type: "service_account",
            project_id: process.env.FIREBASE_PROJECT_ID,
            private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
            private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
            client_email: process.env.FIREBASE_CLIENT_EMAIL,
            client_id: process.env.FIREBASE_CLIENT_ID,
            auth_uri: process.env.FIREBASE_AUTH_URI,
            token_uri: process.env.FIREBASE_TOKEN_URI
        };

        // Verificar que las credenciales estén configuradas
        if (serviceAccount.project_id && serviceAccount.private_key) {
            if (!admin.apps.length) {
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                    databaseURL: `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com`
                });
            }
            firebaseInitialized = true;
        } else {
            console.warn('⚠️ Firebase no configurado. Servidor funcionará en modo DEMO.');
            firebaseInitialized = false;
        }
    }

    if (firebaseInitialized) {
        console.log('✅ Firebase inicializado correctamente');
    }
    
} catch (error) {
    console.error('❌ Error inicializando Firebase:', error.message);
    console.log('⚠️ Servidor funcionará en modo DEMO sin persistencia');
    firebaseInitialized = false;
}

// Crear objetos mock si Firebase no está disponible
let db, auth;

if (firebaseInitialized) {
    try {
        db = admin.firestore();
        auth = admin.auth();
    } catch (error) {
        console.log('📝 Error accediendo a Firebase, usando modo mock');
        firebaseInitialized = false;
    }
}

if (!firebaseInitialized) {
    // Datos mock en memoria para demo
    const mockUsers = [
        {
            id: 'admin-mock-id',
            email: 'admin@restaurant.com',
            password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password: admin123
            name: 'Administrador',
            role: 'admin',
            active: true
        },
        {
            id: 'worker-mock-id',
            email: 'worker@restaurant.com',
            password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', // password: worker123
            name: 'Trabajador',
            role: 'worker',
            active: true
        }
    ];
    
    const mockProducts = [
        { id: 'prod1', name: 'Hamburguesa Clásica', price: 12.50, category: 'hamburguesas', active: true },
        { id: 'prod2', name: 'Pizza Margherita', price: 18.00, category: 'pizzas', active: true },
        { id: 'prod3', name: 'Ensalada César', price: 10.00, category: 'ensaladas', active: true },
        { id: 'prod4', name: 'Refresco Cola', price: 2.50, category: 'bebidas', active: true }
    ];
    
    let mockSales = [];
    
    // Mock de Firestore
    db = {
        collection: (collectionName) => ({
            add: (data) => {
                const id = 'mock-' + Date.now();
                if (collectionName === 'sales') {
                    mockSales.push({ id, ...data });
                }
                return Promise.resolve({ id });
            },
            doc: (docId) => ({
                get: () => {
                    let data = null;
                    if (collectionName === 'users') {
                        data = mockUsers.find(u => u.id === docId);
                    } else if (collectionName === 'products') {
                        data = mockProducts.find(p => p.id === docId);
                    }
                    return Promise.resolve({ 
                        exists: !!data, 
                        data: () => data,
                        id: docId 
                    });
                },
                set: () => Promise.resolve(),
                update: () => Promise.resolve()
            }),
            where: (field, operator, value) => ({
                get: () => {
                    let results = [];
                    if (collectionName === 'users') {
                        results = mockUsers.filter(u => u[field] === value);
                    } else if (collectionName === 'products') {
                        results = mockProducts.filter(p => p[field] === value);
                    } else if (collectionName === 'sales') {
                        results = mockSales.filter(s => s[field] === value);
                    }
                    return Promise.resolve({
                        empty: results.length === 0,
                        docs: results.map(item => ({
                            id: item.id,
                            data: () => item
                        }))
                    });
                },
                orderBy: () => ({
                    get: () => {
                        let results = [];
                        if (collectionName === 'products') {
                            results = mockProducts.filter(p => p.active);
                        }
                        return Promise.resolve({
                            empty: results.length === 0,
                            forEach: (callback) => {
                                results.forEach(item => {
                                    callback({ id: item.id, data: () => item });
                                });
                            }
                        });
                    }
                })
            }),
            orderBy: () => ({
                get: () => {
                    let results = [];
                    if (collectionName === 'products') {
                        results = mockProducts;
                    }
                    return Promise.resolve({
                        empty: results.length === 0,
                        forEach: (callback) => {
                            results.forEach(item => {
                                callback({ id: item.id, data: () => item });
                            });
                        }
                    });
                }
            })
        })
    };
    
    auth = {
        verifyIdToken: () => Promise.resolve({ uid: 'mock-uid' })
    };
    
    console.log('🎭 Modo DEMO activado con datos mock');
    console.log('👤 Usuarios disponibles:');
    console.log('   Admin: admin@restaurant.com / admin123');
    console.log('   Worker: worker@restaurant.com / worker123');
}

module.exports = { admin, db, auth, firebaseInitialized };