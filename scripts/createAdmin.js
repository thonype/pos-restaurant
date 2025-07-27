const bcrypt = require('bcryptjs');
const { db } = require('../config/firebase');

// Script para crear el usuario administrador inicial
async function createAdminUser() {
    try {
        console.log('🔧 Creando usuario administrador...');
        
        const adminEmail = 'admin@restaurant.com';
        const adminPassword = 'admin123'; // Cambiar por una contraseña segura
        const adminName = 'Administrador';
        
        // Verificar si ya existe un admin
        const existingAdmin = await db.collection('users')
            .where('email', '==', adminEmail)
            .get();
            
        if (!existingAdmin.empty) {
            console.log('❌ El usuario administrador ya existe');
            return;
        }
        
        // Encriptar contraseña
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        
        // Crear usuario admin
        const adminRef = await db.collection('users').add({
            email: adminEmail,
            password: hashedPassword,
            name: adminName,
            role: 'admin',
            active: true,
            createdAt: new Date()
        });
        
        console.log('✅ Usuario administrador creado exitosamente');
        console.log(`📧 Email: ${adminEmail}`);
        console.log(`🔑 Contraseña: ${adminPassword}`);
        console.log(`🆔 ID: ${adminRef.id}`);
        console.log('⚠️  IMPORTANTE: Cambia la contraseña después del primer login');
        
    } catch (error) {
        console.error('❌ Error creando administrador:', error);
    }
}

// Ejecutar si se llama directamente
if (require.main === module) {
    createAdminUser().then(() => {
        console.log('🏁 Script completado');
        process.exit(0);
    }).catch(error => {
        console.error('💥 Error en script:', error);
        process.exit(1);
    });
}

module.exports = { createAdminUser };