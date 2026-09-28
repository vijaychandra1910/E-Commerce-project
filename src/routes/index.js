const express = require('express');
const router = express.Router();
const authRoutes = require('./auth.routes');
const productRoutes = require('./product.routes');

// System status / Health check
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'E-Commerce Secure REST API'
  });
});

// Mount modules
router.use('/auth', authRoutes);
router.use('/products', productRoutes);

module.exports = router;
