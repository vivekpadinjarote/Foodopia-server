import mongoose from "mongoose";

export const connectDB= async ()=>{
    await mongoose.connect('mongodb://localhost:27017/Foodopia_DB').then(()=>console.log("DB Connected"))
}