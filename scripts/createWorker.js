const bcrypt = require('bcryptjs');
const { db } = require('../config/firebase');

// Script para crear un usuario trabajador
async function createWorkerUser() {
    try {
        console.log('🔧 Creando usuario trabajador...');
        
        const workerEmail = 'worker@restaurant.com';
        const workerPassword = 'worker123';
        const workerName = 'Trabajador Demo';
        
        // Verificar si ya existe
        const existingWorker = await db.collection('users')
            .where('email', '==', workerEmail)
            .get();
            
        if (!existingWorker.empty) {
            console.log('❌ El usuario trabajador ya existe');
            return;
        }
        
        // Encriptar contraseña
        const hashedPassword = await bcrypt.hash(workerPassword, 10);
        
        // Crear usuario trabajador
        const workerRef = await db.collection('users').add({
            email: workerEmail,
            password: hashedPassword,
            name: workerName,
            role: 'worker',
            active: true,
            createdAt: new Date()
        });
        
        console.log('✅ Usuario trabajador creado exitosamente');
        console.log(`📧 Email: ${workerEmail}`);
        console.log(`🔑 Contraseña: ${workerPassword}`);
        console.log(`🆔 ID: ${workerRef.id}`);
        
    } catch (error) {
        console.error('❌ Error creando trabajador:', error);
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    createWorkerUser().then(() => {
        console.log('🏁 Script completado');
        process.exit(0);
    }).catch(error => {
        console.error('💥 Error en script:', error);
        process.exit(1);
    });
}

module.exports = { createWorkerUser };