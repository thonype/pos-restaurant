const jwt = require('jsonwebtoken');
const { db } = require('../config/firebase');

// Middleware para verificar token JWT
const verifyToken = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'Token no proporcionado' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Obtener información del usuario desde Firebase
        const userDoc = await db.collection('users').doc(decoded.userId).get();
        
        if (!userDoc.exists) {
            return res.status(401).json({ error: 'Usuario no encontrado' });
        }

        req.user = {
            id: decoded.userId,
            ...userDoc.data()
        };
        
        next();
    } catch (error) {
        console.error('Error en verificación de token:', error);
        res.status(401).json({ error: 'Token inválido' });
    }
};

// Middleware para verificar rol de administrador
const verifyAdmin = (req, res, next) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador' });
    }
    next();
};

module.exports = { verifyToken, verifyAdmin };