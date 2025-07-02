import mongoose from "mongoose";

const tokenSchema = new mongoose.Schema(
  {
    refreshToken: {type: String},
    userAgent: {type: String},
    createdAt: {type: Date, default:Date.now}
  }
);

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone:{type:String},
    password: { type: String, required: true },
    role: {type: String , required: true},
    address: { type: Object},
    cartData: { type: Object, default: {} },
    tokens:[tokenSchema],
    profilePic:{
      type:{
        url:{type:String},
        publicId:{type:String}
      }, 
      default:{}
    }
  },
  { minimize: false }
);

const userModel = new mongoose.model("user", userSchema);
export default userModel;
