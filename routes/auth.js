const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/firebase');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

const router = express.Router();

// Registro de usuario (solo admin puede crear usuarios)
router.post('/register', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { email, password, name, role = 'worker' } = req.body;

        // Validaciones básicas
        if (!email || !password || !name) {
            return res.status(400).json({ error: 'Email, contraseña y nombre son requeridos' });
        }

        // Verificar si el usuario ya existe
        const existingUser = await db.collection('users').where('email', '==', email).get();
        if (!existingUser.empty) {
            return res.status(400).json({ error: 'El usuario ya existe' });
        }

        // Encriptar contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Crear usuario en Firebase
        const userRef = await db.collection('users').add({
            email,
            password: hashedPassword,
            name,
            role,
            active: true,
            createdAt: new Date(),
            createdBy: req.user.id
        });

        res.status(201).json({
            message: 'Usuario creado exitosamente',
            userId: userRef.id
        });

    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son requeridos' });
        }

        // Buscar usuario
        const userQuery = await db.collection('users').where('email', '==', email).get();
        
        if (userQuery.empty) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const userDoc = userQuery.docs[0];
        const userData = userDoc.data();

        // Verificar si el usuario está activo
        if (!userData.active) {
            return res.status(401).json({ error: 'Usuario desactivado' });
        }

        // Verificar contraseña
        const isValidPassword = await bcrypt.compare(password, userData.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Generar token JWT
        const token = jwt.sign(
            { userId: userDoc.id, role: userData.role },
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        // Registrar último login
        await db.collection('users').doc(userDoc.id).update({
            lastLogin: new Date()
        });

        res.json({
            message: 'Login exitoso',
            token,
            user: {
                id: userDoc.id,
                name: userData.name,
                email: userData.email,
                role: userData.role
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Verificar token
router.get('/verify', verifyToken, (req, res) => {
    res.json({
        valid: true,
        user: {
            id: req.user.id,
            name: req.user.name,
            email: req.user.email,
            role: req.user.role
        }
    });
});

module.exports = router;