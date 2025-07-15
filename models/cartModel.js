import mongoose from 'mongoose';

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true
  },
  items: [{
    _id: false,
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'food',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
    }
  }],
  totalPrice: {
    type: Number,
    required: true,
    min: 0
  }
});

const cartModel = mongoose.model('cart', cartSchema);
export default cartModel;
