 import express from 'express'
 import multer from "multer"
 import foodModel from "../models/foodModel.js";
import { cloudinary, storage_food_image } from '../utils/cloudinary.js';
import {adminAuthMiddleware} from '../middleware/auth.js';


 const foodRouter = express.Router();

 // image storage Engine

 const upload = multer({storage:storage_food_image})

foodRouter.post("/add",adminAuthMiddleware,(req, res, next) => {upload.single("image")(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      console.error("Multer error:", err.message);
      return res.status(400).json({ success: false, message: err.message });
    } else if (err) {
      // This catches Cloudinary or general errors
      console.error("Image upload error:", err);
      return res.status(500).json({ success: false, message: err.message });
    }

    // Proceed if no upload errors
    next();
  });
},async (req, res) => {
    const food = new foodModel({
        name: req.body.name,
        description: req.body.description,
        price: req.body.price,
        category: req.body.category,
        image: {
            url: req.file.path,
            publicId: req.file.filename
        },
        rating: req.body.rating,
        veg_type: req.body.veg_type
    })

    try {
        await food.save();
        res.json({ success: true, message: "Food Added" })
    } catch (error) {
        console.log(error)
        res.status(500).json({ success: false, message: "Error" })
    }
});

foodRouter.get("/list",async (req, res) => {
    try {
        const foods = await foodModel.find({})
        res.json({ success: true, foodItems: foods })
    } catch (error) {
        console.log(error);
        res.json({ success: false, message: "Error" })
    }
});

foodRouter.post("/remove",adminAuthMiddleware,async (req,res)=> {
try {
    const food = await foodModel.findById(req.body.id);

    if(!food){
        return res.status(404).json({success:false,message:"No item found"})
    }

    await cloudinary.uploader.destroy(food.image.publicId)

    await foodModel.findByIdAndDelete(req.body.id);
    res.json({success:true,message:"Food Removed"})
} catch (error) {
    console.log(error)
    res.json({success:false,message:"Error"})
    
}
});





 export default foodRouter;