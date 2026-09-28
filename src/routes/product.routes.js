const express = require('express');
const router = express.Router();
const {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct
} = require('../controllers/product.controller');
const {
  createProductValidator,
  updateProductValidator,
  productIdParamValidator,
  listProductQueryValidator
} = require('../validators/product.validator');
const { validate } = require('../middlewares/validation.middleware');
const { authenticate } = require('../middlewares/auth.middleware');

// Public product routes
router.get('/', validate(listProductQueryValidator), getProducts);
router.get('/:id', validate(productIdParamValidator), getProductById);

// Protected product routes (Require Bearer JWT authentication)
router.post('/', authenticate, validate(createProductValidator), createProduct);
router.put('/:id', authenticate, validate(updateProductValidator), updateProduct);
router.delete('/:id', authenticate, validate(productIdParamValidator), deleteProduct);

module.exports = router;
