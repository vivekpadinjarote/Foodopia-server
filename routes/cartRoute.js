import express from "express";
import authMiddleware  from "../middleware/auth.js";
const cartRouter = express.Router();
import userModel from "../models/userModel.js";

cartRouter.post("/add",authMiddleware,async (req,res)=>{
try {
    let userData = await userModel.findById(req.body.userId);
    let cartData = await userData.cartData;

    if (!cartData[req.body.itemId]) {
        cartData[req.body.itemId]=1;
    }

    else{
        cartData[req.body.itemId]+=1;
    }
    await userModel.findByIdAndUpdate(req.body.userId,{cartData});
    res.json({success:true,message:"Added to Cart"});
} catch (error) {
    console.log(error);
    res.json({success:false,message:"Error"});
}
});


cartRouter.post("/remove",authMiddleware,async (req,res)=>{
try {
    let userData = await userModel.findById(req.body.userId);
let cartData = await userData.cartData;

if (cartData[req.body.itemId]>0) {
    cartData[req.body.itemId]-=1;
}

await userModel.findByIdAndUpdate(req.body.userId,{cartData});
res.json({success:true,message:"Removed from Cart"});
} catch (error) {
    console.log(error);
    res.json({success:false,message:"Error"});
}
});

cartRouter.post("/get",authMiddleware,async (req,res)=>{
try {
    let userData = await userModel.findById(req.body.userId);
    let cartData = await userData.cartData;
    res.json({success:true,cartData});
} catch (error) {
   console.log(error);
   res.json({success:false,message:"Error"});
}
});


export default cartRouter;