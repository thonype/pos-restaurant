const express = require('express');
const { db } = require('../config/firebase');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

const router = express.Router();

// Obtener todos los productos (trabajadores y admin)
router.get('/', verifyToken, async (req, res) => {
    try {
        const productsSnapshot = await db.collection('products')
            .where('active', '==', true)
            .orderBy('name')
            .get();

        const products = [];
        productsSnapshot.forEach(doc => {
            products.push({
                id: doc.id,
                ...doc.data()
            });
        });

        res.json(products);
    } catch (error) {
        console.error('Error obteniendo productos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Crear producto (solo admin)
router.post('/', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { name, description, price, category, image } = req.body;

        if (!name || !price) {
            return res.status(400).json({ error: 'Nombre y precio son requeridos' });
        }

        if (price <= 0) {
            return res.status(400).json({ error: 'El precio debe ser mayor a 0' });
        }

        const productRef = await db.collection('products').add({
            name,
            description: description || '',
            price: parseFloat(price),
            category: category || 'general',
            image: image || '',
            active: true,
            createdAt: new Date(),
            createdBy: req.user.id,
            updatedAt: new Date()
        });

        // Registrar cambio en auditoría
        await db.collection('audit_log').add({
            action: 'CREATE_PRODUCT',
            entityType: 'product',
            entityId: productRef.id,
            userId: req.user.id,
            userName: req.user.name,
            changes: { name, price, category },
            timestamp: new Date()
        });

        res.status(201).json({
            message: 'Producto creado exitosamente',
            productId: productRef.id
        });

    } catch (error) {
        console.error('Error creando producto:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Actualizar producto (solo admin)
router.put('/:id', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, category, image } = req.body;

        // Obtener producto actual para auditoría
        const currentProduct = await db.collection('products').doc(id).get();
        if (!currentProduct.exists) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }

        const updateData = {
            updatedAt: new Date(),
            updatedBy: req.user.id
        };

        if (name) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (price) {
            if (price <= 0) {
                return res.status(400).json({ error: 'El precio debe ser mayor a 0' });
            }
            updateData.price = parseFloat(price);
        }
        if (category) updateData.category = category;
        if (image !== undefined) updateData.image = image;

        await db.collection('products').doc(id).update(updateData);

        // Registrar cambio en auditoría
        await db.collection('audit_log').add({
            action: 'UPDATE_PRODUCT',
            entityType: 'product',
            entityId: id,
            userId: req.user.id,
            userName: req.user.name,
            changes: updateData,
            previousData: currentProduct.data(),
            timestamp: new Date()
        });

        res.json({ message: 'Producto actualizado exitosamente' });

    } catch (error) {
        console.error('Error actualizando producto:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;