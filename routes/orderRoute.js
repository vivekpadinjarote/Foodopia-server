import express from "express";
import razorpay from "razorpay";
import crypto from "crypto";
import orderModel from "../models/orderModel.js";
import { emitToUser } from "../utils/socket.js";
import { appendFile } from "fs";
import { adminAuthMiddleware, authMiddleware } from "../middleware/auth.js";

const orderRouter = express.Router();

const razorpayInstance = new razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

orderRouter.post("/create-order", async (req, res) => {
    const { amount, currency='INR' } = req.body;

    try {
        const options = {
            amount: amount,
            currency,
            receipt: `receipt_${Date.now()}`
        };
    
        const order = await razorpayInstance.orders.create(options);
        res.status(200).json({ success: true, order });
    } catch (error) {
        console.error("Error creating order:", error);
        res.status(500).json({ success: false, message: "Failed to create order" });
    }
});

orderRouter.post("/verify",authMiddleware, async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, items, amount, address } = req.body;
    const key_secret = process.env.RAZORPAY_KEY_SECRET;
    const generated_signature = crypto
        .createHmac("sha256", key_secret)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest("hex");

    if (generated_signature === razorpay_signature) {
        // Save order to DB
        try {
            const orderDoc = new orderModel({
                orderId: razorpay_order_id,
                userId: req.userId,
                items: items,
                amount: amount,
                address: address,
                payment: true,
                createdAt: new Date()
            });
            await orderDoc.save();
            emitToUser(req.app.get('io'), req.userId, "cart:update", {
          items: [],
          totalPrice: 0,
          totalItems: 0,
        })
            res.status(200).json({ success: true, message: "Signature verified, order saved" });
        } catch (dbErr) {
            console.error("DB save error:", dbErr);
            res.status(500).json({ success: false, message: "Signature verified but failed to save order" });
        }
    } else {
        res.status(400).json({ success: false, message: "Invalid signature" });
    }
});

orderRouter.get('/my-orders',authMiddleware,async (req,res)=>{
    try{
    const orders = await orderModel.find({userId:req.userId})

    if(!orders){
        return res.status(404).json({success:false,message:"No orders by the user yet"})
    }

    res.status(200).json({success:true,message:"Orders fetched successfully",orders})
}catch(err){
    console.error("Error fetching orders: ",err)
}

})

orderRouter.get('/all-orders',adminAuthMiddleware,async (req,res)=>{
    try{
    const orders = await orderModel.find().populate('userId', 'name email');

    if(!orders){
        return res.status(404).json({success:false,message:"No orders yet"})
    }

    res.status(200).json({success:true,message:"Orders fetched successfully",orders})
}catch(err){
    console.error("Error fetching orders: ",err)
}
})

export default orderRouter;