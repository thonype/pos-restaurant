const admin = require('firebase-admin');
const path = require('path');

// Configuración de Firebase Admin
try {
    // Opción 1: Usar archivo JSON directamente (más fácil)
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
    } else {
        // Opción 2: Usar variables de entorno
        console.log('🔧 Usando variables de entorno');
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
        if (!serviceAccount.project_id || !serviceAccount.private_key) {
            throw new Error('❌ Credenciales de Firebase no configuradas. Coloca el archivo firebase-service-account.json en la raíz del proyecto.');
        }

        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                databaseURL: `https://${serviceAccount.project_id}-default-rtdb.firebaseio.com`
            });
        }
    }

    console.log('✅ Firebase inicializado correctamente');
    
} catch (error) {
    console.error('❌ Error inicializando Firebase:', error.message);
    console.log('\n📋 Pasos para configurar Firebase:');
    console.log('1. Crea el archivo firebase-service-account.json en la raíz del proyecto');
    console.log('2. Copia las credenciales de Firebase en ese archivo');
    console.log('3. Reinicia el servidor\n');
    process.exit(1);
}

const db = admin.firestore();
const auth = admin.auth();

module.exports = { admin, db, auth };