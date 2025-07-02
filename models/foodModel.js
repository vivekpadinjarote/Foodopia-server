import mongoose from "mongoose";

const foodSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String, required: true },
  price: { type: Number, required: true },
  image: { type: {
    url: {type:String},
    publicId:{type:String}
  }, required: true },
  category: { type: String, required: true },
  rating: { type: Number, default: 0 },
  veg_type: { type: String, enum: ['veg', 'non-veg'] },
});

const foodModel =new mongoose.model("food", foodSchema);

export default foodModel;

