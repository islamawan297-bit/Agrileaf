const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please add a product title'],
      trim: true
    },
    description: {
      type: String
    },
    category: {
      type: String,
      required: [true, 'Please specify a category']
    },
    price: {
      type: Number,
      required: [true, 'Please add a price']
    },
    unit: {
      type: String,
      required: [true, 'Please specify the unit (e.g. per kg, per ton)']
    },
    quantityAvailable: {
      type: Number,
      default: 0
    },
    images: {
      type: [String],
      default: []
    },
    farmer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Product', productSchema);
