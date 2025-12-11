import express from 'express';
const router = express.Router();
import Product from '../models/Product.js';
import { protect, isFarmer } from '../middleware/authMiddleware.js';

// --- PUBLIC ROUTES FOR CONSUMERS ---

// @desc    Get ALL products
// @route   GET /api/products
// @access  Public
router.get('/', async (req, res) => {
    try {
        const products = await Product.find({}).populate('user', 'name farmName');
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
});

// @desc    Get products by category
// @route   GET /api/products/category/:name
// @access  Public
router.get('/category/:name', async (req, res) => {
    try {
        const products = await Product.find({ category: req.params.name });
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: "Server Error" });
    }
});


// --- FARMER-ONLY ROUTES (PROTECTED) ---

// @desc    Get all products for the logged-in farmer
// @route   GET /api/products/myproducts
// @access  Private/Farmer
router.get('/myproducts', protect, isFarmer, async (req, res) => {
  const products = await Product.find({ user: req.user._id });
  res.json(products);
});

// @desc    Create a new product
// @route   POST /api/products
// @access  Private/Farmer
router.post('/', protect, isFarmer, async (req, res) => {
  const { name, price, image, location, category, countInStock } = req.body;

  const product = new Product({
    name,
    price,
    image,
    location,
    category, 
    countInStock, // <-- ADDED
    user: req.user._id,
  });

  try {
    const createdProduct = await product.save();
    res.status(201).json(createdProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Farmer
router.put('/:id', protect, isFarmer, async (req, res) => {
  const { name, price, image, location, category, countInStock } = req.body;
  const product = await Product.findById(req.params.id);

  if (product && product.user.toString() === req.user._id.toString()) {
    product.name = name || product.name;
    product.price = price || product.price;
    product.image = image || product.image;
    product.location = location || product.location;
    product.category = category || product.category;
    product.countInStock = countInStock ?? product.countInStock; // <-- Use ?? to allow 0

    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } else {
    res.status(404).json({ message: 'Product not found or user not authorized' });
  }
});

// @desc    Delete a product
// @route   DELETE /api/products/:id
// @access  Private/Farmer
router.delete('/:id', protect, isFarmer, async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (product && product.user.toString() === req.user._id.toString()) {
    await product.deleteOne();
    res.json({ message: 'Product removed' });
  } else {
    res.status(404).json({ message: 'Product not found or user not authorized' });
  }
});

export default router;