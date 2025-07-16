import express from "express";
import {authMiddleware}  from "../middleware/auth.js";
const cartRouter = express.Router();
import cartModel from "../models/cartModel.js";
import { emitToUser } from "../utils/socket.js";

cartRouter.post("/",authMiddleware,async (req,res)=>{
    const {cartItem, quantity} = req.body;
    if (!cartItem || typeof cartItem !== "object") {
        return res.status(400).json({ success: false, message: "Invalid item" });
    }

try {
    let cartData = await cartModel.findOne({ userId: req.userId });
    
    if (!cartData) {
        cartData = new cartModel({
            userId: req.userId,
            items: [{productId:cartItem._id, quantity: quantity || 1}],
            totalPrice: cartItem.price,
        });
        await cartData.save();
        await cartData.populate('items.productId', "name price");
        emitToUser (req.app.get('io'),req.userId,"cart:update",cartData)
        return res.json({ success: true, message: "Added to Cart", cartData });
    }

    const itemIndex = cartData.items.findIndex(item => item.productId.toString() === cartItem._id.toString());


    if (itemIndex === -1) {
        cartData.items.push({ productId: cartItem._id, quantity: quantity || 1 });
        cartData.totalPrice += cartItem.price * (quantity || 1);
    } else if (quantity === 0) {
        cartData.items = cartData.items.filter((item) => item.productId.toString() !== cartItem._id.toString());
        cartData.totalPrice -= cartItem.price;
    } else {
        let oldquantity = cartData.items[itemIndex].quantity;
        cartData.items[itemIndex].quantity = quantity;
        if (quantity > (oldquantity)) {
            cartData.totalPrice += cartItem.price;
        } else if (quantity < (oldquantity)) {
            cartData.totalPrice -= cartItem.price;
        }
    }

    if (cartData.totalPrice < 0) {
        cartData.totalPrice = 0;
    }

    await cartData.save();
        await cartData.populate('items.productId', "name price");
    
    
    emitToUser (req.app.get('io'),req.userId,"cart:update",cartData)

    res.json({ success: true, message: "Added to Cart", cartData });
} catch (error) {
    console.log(error);
    res.status(500).json({ success: false, message: error.message || "Error" });
}
});


cartRouter.get("/",authMiddleware,async (req,res)=>{
try {
    let cartData = await cartModel.findOne({ userId: req.userId }).populate("items.productId", "name price");
    console.log("Cart Data:", cartData);
    if (!cartData) {
        return res.json({ success: true, message: "Cart is empty", cartData: [] });
    }else{
        if(cartData.items.length === 0){
            return res.json({ success: true, message: "Cart is empty", cartData: [] });
        }
        return res.json({ success: true, cartData });
    }
} catch (error) {
   console.log(error);
   res.json({ success: false, message: "Error" });
}
});

cartRouter.delete("/",authMiddleware,async (req,res)=>{
    
    
    try {
        await cartModel.findOneAndDelete({ userId: req.userId });

        emitToUser(req.app.get('io'), req.userId, "cart:update", {
          items: [],
          totalPrice: 0,
          totalItems: 0,
        })
        res.status(200).json({ success: true, message: "Cart Cleared"});
    } catch (error) {
        console.log(error);
        res.status(500).json({ success: false, message: error.message || "Error" });
    }
});

cartRouter.put("/", authMiddleware, async (req, res) => {
  const { cartItems } = req.body;

  if (!cartItems || !Array.isArray(cartItems)) {
    return res.status(400).json({ success: false, message: "Invalid cart items" });
  }

  try {
    let cartData = await cartModel.findOne({ userId: req.userId });

    if (!cartData) {
      // Create new cart
      const newItems = cartItems.map(item => ({
        productId: item._id,
        quantity: item.quantity || 1,
      }));

      const newTotalPrice = cartItems.reduce(
        (total, item) => total + item.price * (item.quantity || 1),
        0
      );

      cartData = new cartModel({
        userId: req.userId,
        items: newItems,
        totalPrice: newTotalPrice,
      });

      await cartData.save();
        await cartData.populate('items.productId', "name price");

        emitToUser(req.app.get('io'),req.userId,"cart:update",cartData)

      return res.json({ success: true, message: "Cart created", cartData });
    }

    if(cartData.items.length === 0){
        cartData.items = cartItems.map(item => ({
          productId: item._id,
          quantity: item.quantity || 1,
        }));
        cartData.totalPrice = cartItems.reduce(
          (total, item) => total + item.price * (item.quantity || 1),
          0
        );
        await cartData.save();
        await cartData.populate('items.productId', "name price");
        emitToUser(req.app.get('io'),req.userId,"cart:update",cartData)
        return res.json({ success: true, message: "Cart updated with new items", cartData });
    }   

    const existingItems = cartData.items.map(item => ({...item}));
    const newItems = cartItems.map(item => ({...item }));

    console.log("Existing Items:", existingItems);
    console.log("New Items:", newItems);

    newItems.forEach(newItem => {
  const existingItem = cartData.items.find(item => 
    item.productId.toString() === newItem._id.toString()
  );

  const itemQuantity = newItem.quantity || 1;
  const itemPrice = newItem.price || 0;

  if (!existingItem) {
    // Push new item
    cartData.items.push({
      productId: newItem._id,
      quantity: itemQuantity,
    });

    cartData.totalPrice += itemPrice * itemQuantity;
  } else {
    // Update quantity
    existingItem.quantity = Math.max(existingItem.quantity, itemQuantity);

    // Recalculate totalPrice from scratch to avoid compounding
    cartData.totalPrice = cartData.items.reduce((total, item) => {
      const matchedNewItem = newItems.find(newI => newI._id.toString() === item.productId.toString());
      const itemUnitPrice = matchedNewItem?.price || 0;
      return total + (itemUnitPrice * item.quantity);
    }, 0);
  }
});

    

    await cartData.save();
    await cartData.populate('items.productId', "name price");

    emitToUser(req.app.get('io'),req.userId,"cart:update",cartData)

    return res.json({ success: true, message: "Cart updated with merged items", cartData });

  } catch (error) {
    console.error("Cart update failed:", error);
    res.status(500).json({ success: false, message: error.message || "Internal Server Error" });
  }
});




export default cartRouter;