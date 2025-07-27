const express = require('express');
const { db } = require('../config/firebase');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Crear nueva venta
router.post('/', verifyToken, async (req, res) => {
    try {
        const { items, customerName, paymentMethod = 'efectivo' } = req.body;

        // Validaciones
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Se requiere al menos un producto' });
        }

        let total = 0;
        const saleItems = [];

        // Verificar productos y calcular total
        for (const item of items) {
            const { productId, quantity } = item;
            
            if (!productId || !quantity || quantity <= 0) {
                return res.status(400).json({ error: 'Producto y cantidad válidos son requeridos' });
            }

            // Obtener información del producto
            const productDoc = await db.collection('products').doc(productId).get();
            
            if (!productDoc.exists || !productDoc.data().active) {
                return res.status(400).json({ error: `Producto ${productId} no encontrado o inactivo` });
            }

            const productData = productDoc.data();
            const itemTotal = productData.price * quantity;
            total += itemTotal;

            saleItems.push({
                productId,
                productName: productData.name,
                price: productData.price,
                quantity,
                subtotal: itemTotal
            });
        }

        // Crear la venta
        const saleRef = await db.collection('sales').add({
            items: saleItems,
            total,
            customerName: customerName || 'Cliente general',
            paymentMethod,
            sellerId: req.user.id,
            sellerName: req.user.name,
            createdAt: new Date(),
            status: 'completed'
        });

        // Registrar en auditoría
        await db.collection('audit_log').add({
            action: 'CREATE_SALE',
            entityType: 'sale',
            entityId: saleRef.id,
            userId: req.user.id,
            userName: req.user.name,
            changes: { total, itemsCount: saleItems.length },
            timestamp: new Date()
        });

        res.status(201).json({
            message: 'Venta registrada exitosamente',
            saleId: saleRef.id,
            total,
            items: saleItems
        });

    } catch (error) {
        console.error('Error creando venta:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener ventas del día actual (para trabajadores)
router.get('/today', verifyToken, async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        let query = db.collection('sales')
            .where('createdAt', '>=', today)
            .where('createdAt', '<', tomorrow)
            .orderBy('createdAt', 'desc');

        // Si no es admin, solo mostrar sus propias ventas
        if (req.user.role !== 'admin') {
            query = query.where('sellerId', '==', req.user.id);
        }

        const salesSnapshot = await query.get();
        const sales = [];
        
        salesSnapshot.forEach(doc => {
            sales.push({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt.toDate()
            });
        });

        res.json(sales);

    } catch (error) {
        console.error('Error obteniendo ventas del día:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Obtener detalle de una venta específica
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const saleDoc = await db.collection('sales').doc(id).get();

        if (!saleDoc.exists) {
            return res.status(404).json({ error: 'Venta no encontrada' });
        }

        const saleData = saleDoc.data();

        // Si no es admin, solo puede ver sus propias ventas
        if (req.user.role !== 'admin' && saleData.sellerId !== req.user.id) {
            return res.status(403).json({ error: 'No tienes permiso para ver esta venta' });
        }

        res.json({
            id: saleDoc.id,
            ...saleData,
            createdAt: saleData.createdAt.toDate()
        });

    } catch (error) {
        console.error('Error obteniendo venta:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;