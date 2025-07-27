const express = require('express');
const { db } = require('../config/firebase');
const { verifyToken, verifyAdmin } = require('../middleware/auth');

const router = express.Router();

// Reporte de ventas diarias (solo admin)
router.get('/daily', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { date } = req.query;
        
        let targetDate = new Date();
        if (date) {
            targetDate = new Date(date);
        }
        
        targetDate.setHours(0, 0, 0, 0);
        const nextDay = new Date(targetDate);
        nextDay.setDate(nextDay.getDate() + 1);

        const salesSnapshot = await db.collection('sales')
            .where('createdAt', '>=', targetDate)
            .where('createdAt', '<', nextDay)
            .orderBy('createdAt', 'desc')
            .get();

        const sales = [];
        let totalRevenue = 0;
        const sellerStats = {};
        const productStats = {};

        salesSnapshot.forEach(doc => {
            const saleData = doc.data();
            sales.push({
                id: doc.id,
                ...saleData,
                createdAt: saleData.createdAt.toDate()
            });

            totalRevenue += saleData.total;

            // Estadísticas por vendedor
            if (!sellerStats[saleData.sellerId]) {
                sellerStats[saleData.sellerId] = {
                    name: saleData.sellerName,
                    sales: 0,
                    revenue: 0
                };
            }
            sellerStats[saleData.sellerId].sales += 1;
            sellerStats[saleData.sellerId].revenue += saleData.total;

            // Estadísticas por producto
            saleData.items.forEach(item => {
                if (!productStats[item.productId]) {
                    productStats[item.productId] = {
                        name: item.productName,
                        quantity: 0,
                        revenue: 0
                    };
                }
                productStats[item.productId].quantity += item.quantity;
                productStats[item.productId].revenue += item.subtotal;
            });
        });

        res.json({
            date: targetDate.toISOString().split('T')[0],
            summary: {
                totalSales: sales.length,
                totalRevenue,
                averageTicket: sales.length > 0 ? totalRevenue / sales.length : 0
            },
            sales,
            sellerStats: Object.values(sellerStats),
            productStats: Object.values(productStats).sort((a, b) => b.quantity - a.quantity)
        });

    } catch (error) {
        console.error('Error generando reporte diario:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Reporte de productos más vendidos (solo admin)
router.get('/top-products', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { days = 7 } = req.query;
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));
        startDate.setHours(0, 0, 0, 0);

        const salesSnapshot = await db.collection('sales')
            .where('createdAt', '>=', startDate)
            .get();

        const productStats = {};

        salesSnapshot.forEach(doc => {
            const saleData = doc.data();
            saleData.items.forEach(item => {
                if (!productStats[item.productId]) {
                    productStats[item.productId] = {
                        name: item.productName,
                        quantity: 0,
                        revenue: 0,
                        sales: 0
                    };
                }
                productStats[item.productId].quantity += item.quantity;
                productStats[item.productId].revenue += item.subtotal;
                productStats[item.productId].sales += 1;
            });
        });

        const topProducts = Object.values(productStats)
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);

        res.json({
            period: `Últimos ${days} días`,
            topProducts
        });

    } catch (error) {
        console.error('Error generando reporte de productos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

// Reporte de rendimiento por vendedor (solo admin)
router.get('/sellers', verifyToken, verifyAdmin, async (req, res) => {
    try {
        const { days = 30 } = req.query;
        
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - parseInt(days));
        startDate.setHours(0, 0, 0, 0);

        const salesSnapshot = await db.collection('sales')
            .where('createdAt', '>=', startDate)
            .get();

        const sellerStats = {};

        salesSnapshot.forEach(doc => {
            const saleData = doc.data();
            if (!sellerStats[saleData.sellerId]) {
                sellerStats[saleData.sellerId] = {
                    name: saleData.sellerName,
                    sales: 0,
                    revenue: 0,
                    items: 0
                };
            }
            sellerStats[saleData.sellerId].sales += 1;
            sellerStats[saleData.sellerId].revenue += saleData.total;
            sellerStats[saleData.sellerId].items += saleData.items.length;
        });

        const sellersReport = Object.values(sellerStats)
            .map(seller => ({
                ...seller,
                averageTicket: seller.sales > 0 ? seller.revenue / seller.sales : 0
            }))
            .sort((a, b) => b.revenue - a.revenue);

        res.json({
            period: `Últimos ${days} días`,
            sellers: sellersReport
        });

    } catch (error) {
        console.error('Error generando reporte de vendedores:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
});

module.exports = router;