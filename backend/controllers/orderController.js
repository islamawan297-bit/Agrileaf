const Order = require('../models/Order');
const Product = require('../models/Product');

// @desc    Place a new crop order / booking
// @route   POST /api/orders
// @access  Private
const placeOrder = async (req, res, next) => {
  try {
    const { items, shippingAddress } = req.body;

    if (!items || items.length === 0) {
      res.status(400);
      return next(new Error('No order items provided'));
    }

    if (!shippingAddress) {
      res.status(400);
      return next(new Error('Shipping address is required'));
    }

    // Phase 1: Verify all products and validate stock availability (Atomic checks)
    const verifiedItems = [];
    let totalAmount = 0;

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        res.status(404);
        return next(new Error(`Product with ID ${item.product} not found`));
      }

      if (product.quantityAvailable < item.quantity) {
        res.status(400);
        return next(
          new Error(`Insufficient stock for product "${product.title}". Available: ${product.quantityAvailable}, Requested: ${item.quantity}`)
        );
      }

      verifiedItems.push({
        productDoc: product,
        quantity: item.quantity,
        price: product.price // Lock current product price
      });

      totalAmount += product.price * item.quantity;
    }

    // Phase 2: Deduct stock and save products, build final order list
    const orderItems = [];
    for (const item of verifiedItems) {
      item.productDoc.quantityAvailable -= item.quantity;
      await item.productDoc.save();

      orderItems.push({
        product: item.productDoc._id,
        quantity: item.quantity,
        price: item.price
      });
    }

    // Phase 3: Create and return the order
    const order = await Order.create({
      buyer: req.user._id,
      items: orderItems,
      totalAmount,
      shippingAddress
    });

    res.status(201).json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get orders for the logged-in user
// @route   GET /api/orders/my-orders
// @access  Private
const getMyOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ buyer: req.user._id })
      .populate('items.product', 'title category price unit images')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get specific order details
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('buyer', 'name email phone')
      .populate('items.product', 'title price unit farmer');

    if (!order) {
      res.status(404);
      return next(new Error('Order not found'));
    }

    // Authorization: User must be buyer, admin, or the farmer who listed the product
    const isBuyer = order.buyer._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    const isFarmer = order.items.some(
      (item) => item.product && item.product.farmer && item.product.farmer.toString() === req.user._id.toString()
    );

    if (!isBuyer && !isAdmin && !isFarmer) {
      res.status(403);
      return next(new Error('User not authorized to access this order details'));
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update order status
// @route   PATCH /api/orders/:id/status
// @access  Private (Admin/Farmer only)
const updateOrderStatus = async (req, res, next) => {
  try {
    const { orderStatus, paymentStatus } = req.body;

    const order = await Order.findById(req.params.id).populate('items.product');

    if (!order) {
      res.status(404);
      return next(new Error('Order not found'));
    }

    // Authorization: User must be admin or the farmer who owns a product in the order
    const isAdmin = req.user.role === 'admin';
    const isFarmer = order.items.some(
      (item) => item.product && item.product.farmer && item.product.farmer.toString() === req.user._id.toString()
    );

    if (!isAdmin && !isFarmer) {
      res.status(403);
      return next(new Error('User not authorized to update this order status'));
    }

    if (orderStatus) {
      order.orderStatus = orderStatus;
    }
    if (paymentStatus) {
      order.paymentStatus = paymentStatus;
    }

    await order.save();

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: order
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  placeOrder,
  getMyOrders,
  getOrderById,
  updateOrderStatus
};
