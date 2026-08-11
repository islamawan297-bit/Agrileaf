const Product = require('../models/Product');

// @desc    Get all products (with filtering, search, and pagination)
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res, next) => {
  try {
    const { category, search, page = 1, limit = 10 } = req.query;

    const query = {};

    // Category Filter (Case insensitive)
    if (category) {
      query.category = { $regex: new RegExp(category, 'i') };
    }

    // Search Query (Matching title or description)
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Pagination Calculation
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const skip = (pageNum - 1) * limitNum;

    const total = await Product.countDocuments(query);
    const products = await Product.find(query)
      .populate('farmer', 'name email phone')
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: products.length,
      pagination: {
        total,
        page: pageNum,
        pages: Math.ceil(total / limitNum),
        limit: limitNum
      },
      data: products
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single product details
// @route   GET /api/products/:id
// @access  Public
const getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id).populate('farmer', 'name email phone');

    if (!product) {
      res.status(404);
      return next(new Error('Product not found'));
    }

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add new product listing
// @route   POST /api/products
// @access  Private (Farmer/Admin only)
const createProduct = async (req, res, next) => {
  try {
    const { title, description, category, price, unit, quantityAvailable, images } = req.body;

    const product = await Product.create({
      title,
      description,
      category,
      price,
      unit,
      quantityAvailable: quantityAvailable || 0,
      images: images || [],
      farmer: req.user._id
    });

    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update product listing
// @route   PUT /api/products/:id
// @access  Private (Owner/Admin only)
const updateProduct = async (req, res, next) => {
  try {
    let product = await Product.findById(req.params.id);

    if (!product) {
      res.status(404);
      return next(new Error('Product not found'));
    }

    // Ensure logged-in user is the owner or an admin
    if (product.farmer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      res.status(403);
      return next(new Error('User not authorized to update this listing'));
    }

    product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete product listing
// @route   DELETE /api/products/:id
// @access  Private (Owner/Admin only)
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      res.status(404);
      return next(new Error('Product not found'));
    }

    // Ensure logged-in user is the owner or an admin
    if (product.farmer.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      res.status(403);
      return next(new Error('User not authorized to delete this listing'));
    }

    await product.deleteOne();

    res.json({
      success: true,
      message: 'Product listing removed'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};
