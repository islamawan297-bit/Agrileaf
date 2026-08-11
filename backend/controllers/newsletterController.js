const Newsletter = require('../models/Newsletter');

// @desc    Subscribe to newsletter
// @route   POST /api/newsletter/subscribe
// @access  Public
const subscribeNewsletter = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400);
      return next(new Error('Email is required'));
    }

    const subscriberExists = await Newsletter.findOne({ email });
    if (subscriberExists) {
      res.status(400);
      return next(new Error('Email is already subscribed'));
    }

    const subscriber = await Newsletter.create({ email });

    res.status(201).json({
      success: true,
      message: 'Successfully subscribed to the AgriLeaf newsletter!',
      data: subscriber
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  subscribeNewsletter
};
