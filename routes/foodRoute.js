import express from 'express'
 import multer from "multer"
 import foodModel from "../models/foodModel.js";
import { cloudinary, storage_food_image } from '../utils/cloudinary.js';
import {adminAuthMiddleware} from '../middleware/auth.js';
; // Assuming you have set up socket.io in your index.js


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
        req.app.get('io').emit("menu:update");
        res.status(200).json({ success: true, message: "Food Added" })
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

foodRouter.get("/:id",async (req, res) => {
    try {
        const food = await foodModel.findById(req.params.id);
        if (!food) {
            return res.status(404).json({ success: false, message: "Food item not found" });
        }
        console.log("Food item fetched successfully");
        
        res.status(200).json({ success: true, message: "Food item fetched successfully", foodItem: food });
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: "Error" });
    }
});

foodRouter.delete("/:id",adminAuthMiddleware,async (req,res)=> {
try {
    const food = await foodModel.findById(req.params.id);

    if(!food){
        return res.status(404).json({success:false,message:"No item found"})
    }

    await cloudinary.uploader.destroy(food.image.publicId)

    await foodModel.findByIdAndDelete(req.params.id);
    req.app.get('io').emit("menu:update"); // Emit update event to all connected clients
    res.status(200).json({success:true,message:"Food Removed"})
} catch (error) {
    console.log(error)
    res.status(500).json({success:false,message:"Error"})

}
});
foodRouter.put("/update/:id", adminAuthMiddleware, (req, res, next) => {
  upload.single("image")(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      console.error("Multer error:", err.message);
      return res.status(400).json({ success: false, message: err.message });
    } else if (err) {
      console.error("Image upload error:", err);
      return res.status(500).json({ success: false, message: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    const updateData = {
      name: req.body.name,
      description: req.body.description,
      price: req.body.price,
      category: req.body.category,
      rating: req.body.rating,
      veg_type: req.body.veg_type
    };
    if (req.file) {
      const oldFood = await foodModel.findById(req.params.id);
      if (oldFood && oldFood.image && oldFood.image.publicId) {
        try {
          await cloudinary.uploader.destroy(oldFood.image.publicId);
        } catch (err) {
          console.error("Cloudinary delete error:", err.message);
        }
      }
      updateData.image = {
        url: req.file.path,
        publicId: req.file.filename
      };
    }
    const food = await foodModel.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!food) {
      return res.status(404).json({ success: false, message: "Food item not found" });
    }
    console.log("Food item updated successfully");
    req.app.get('io').emit("menu:update"); 
    res.json({ success: true, message: "Food updated", foodItem: food });
  } catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: "Error" });
  }
});





 export default foodRouter;