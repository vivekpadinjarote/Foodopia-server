import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import validator from "validator";
import userModel from "../models/userModel.js";
import dotenv from 'dotenv';
import { authMiddleware } from "../middleware/auth.js";
import multer from "multer";
import { cloudinary, storage } from "../utils/cloudinary.js";
import { emitToUser } from "../utils/socket.js";

dotenv.config()

const userRouter = express.Router();

const createToken = (id,role)=>{
    const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
    const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
    const accessToken = jwt.sign({id,role},ACCESS_SECRET,{expiresIn:'15m'});
    const refreshToken = jwt.sign({id,role},REFRESH_SECRET,{expiresIn:'7d'});

    return {accessToken,refreshToken};
};


userRouter.post("/register",async (req,res)=>{
   const {userName,password,email}= req.body;
   try {
    const exists = await userModel.findOne({email});
    if (exists) {
        return res.json({success:false,message:"User already exists"}); 
    }

    if (!validator.isEmail(email)) {
        return res.json({success:false,message:"Please enter a Valid email"}); 
    }

    if (password.length<8) {
        return res.json({success:false,message:"Please enter a Strong Password"}); 
    }

    const salt =await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password,salt);

    const newUser = new userModel({
        name:userName,
        email:email,
        password:hashedPassword,
        role:'user'
    })

   const user= await newUser.save();
   const {accessToken,refreshToken} = createToken(id,user.role);
    user.tokens.push({
        refreshToken,
        userAgent : req.headers["user-agent"]
    });
    await user.save();

    const userDetails = {
        userId: user._id,
        userName: user.name,
        userEmail: user.email,
        userRole: user.role,
        userAddress: user.address,
        userPhone: user.phone,
        userProfilePic: user.profilePic,
    }

    res.cookie("refreshToken", refreshToken,{
    httpOnly:true,
    sameSite:"Strict",
    secure:false,
    maxAge: 7 * 24 * 60 * 60 * 1000
   })

   console.log("response send")
   res.status(200).json({success:true, accessToken, user:userDetails });

   

   } catch (error) {
    console.log(error);
    res.status(500).json({success:false,message:"Error"})
   }
});

userRouter.post("/login", async (req,res)=>{

    const {email,password} = req.body;
    try {
        const user = await userModel.findOne({email});

        if (!user) {
            return res.json({success:false,message:"User does not exist"})
        }

        const isMatch = await bcrypt.compare(password,user.password);
        if (!isMatch) {
            return res.json({success:false,message:"Invalid credentials"})
        }

        const {refreshToken,accessToken} = createToken(user._id,user.role);
        const exisingToken = user.tokens.find(t=>t.userAgent === req.headers["user-agent"])
        console.log(req.headers["user-agent"])

        if(exisingToken){
            exisingToken.refreshToken = refreshToken;
        }else{
            user.tokens.push({
            refreshToken,
            userAgent : req.headers["user-agent"]
            });
        }
        await user.save();
        

        const userDetails = {
            userId: user._id,
            userName: user.name,
            userEmail: user.email,
            userAddress: user.address,
            userPhone: user.phone,
            userProfilePic: user.profilePic,
            userRole: user.role
        }

        res.cookie("refreshToken", refreshToken,{
        httpOnly:true,
        sameSite:"Strict",
        secure:false,
        maxAge: 7 * 24 * 60 * 60 * 1000
        })
        
        console.log("user Logged in")
        res.status(200).json({success:true, accessToken, user:userDetails });


    } catch (error) {
        console.log(error);
        res.status(500).json({success:false,message:"Error"});
    }

}

);

userRouter.post("/logout",async (req,res)=>{
    const token = req.cookies.refreshToken;
    try{
    const user = await userModel.findOne({"tokens.refreshToken":token})
    if(user){
        user.tokens = user.tokens.filter(t=>t.refreshToken !== token)
        await user.save()
    }

    res.clearCookie("refreshToken")
    res.status(200).json({success:true,message:"Logged out successfully"})
    }catch(error){
        console.log(error);
        res.status(500).json({success:false,message:'Error'})
    }
});

userRouter.put('/profile',authMiddleware,async(req,res)=>{
    const {name,address,phone,email} = req.body
    try{
    const user = await userModel.findById(req.userId)

    if(!user){
        return res.status(404).json({success:false,message:"User Not Found"})
    }
    
    user.name = name;
    user.email = email;
    user.address = address;
    user.phone = phone;

    await user.save();

    const userDetails = {
            userId: user._id,
            userName: user.name,
            userEmail: user.email,
            userAddress: user.address,
            userPhone: user.phone,
            userProfilePic: user.profilePic,
            userRole: user.role
        }

        emitToUser(req.app.get('io'),req.userId,"profile:update",userDetails)

    res.status(200).json({success:true,message:"User details successfully updated", user:userDetails})
    }catch(error){
        console.log(error);
        res.status(500).json({success:false,message:'User profile update failed'})
    }
})

const upload = multer({storage})

userRouter.put('/profile/upload-image',authMiddleware,(req,res,next)=>{upload.single('profilePic')(req,res,function(err){
    if(err instanceof multer.MulterError){
        console.error("Multer error:", err.message);
        return res.status(500).json({success:false,message:err.message})
    }else if(err){
        console.error("Image upload error:", err);
        return res.status(500).json({success:false,message:"Image upload failed"})
    }
    next();
})},async(req,res)=>{

    try{
        const user = await userModel.findById(req.userId)

        if(!user){
            return res.status(404).json({success:false,message:"User Not Found"})
        }
        if(user.profilePic?.publicId){
            await cloudinary.uploader.destroy(user.profilePic.publicId)
        }

        user.profilePic = {url: req.file.path, publicId: req.file.filename}
        await user.save()

        emitToUser(req.app.get('io'),req.userId,"profile-img:update",{
            profilePic: user.profilePic})
        res.status(200).json({success:true,message:"Profile updated",profilePic:user.profilePic})

    }catch(error){
        console.log(error);
        res.status(500).json({success:false,message:'Upload failed'})
    }
})

userRouter.put('/profile/delete-image',authMiddleware,async(req,res)=>{

    try{
        const user = await userModel.findById(req.userId)

        if(!user){
            return res.status(404).json({success:false,message:"User Not Found"})
        }
        if(!user.profilePic?.publicId){
            return res.status(404).json({success:false,message:"User Image Not Found"})
        }

        await cloudinary.uploader.destroy(user.profilePic.publicId)
        user.profilePic = {url:null, publicId: null}
        await user.save()   
        emitToUser(req.app.get('io'),req.userId,"profile-img:update",{
            profilePic: user.profilePic})

        res.status(200).json({success:true,message:"Profile updated"})

    }catch(error){
        console.log(error);
        res.status(500).json({success:false,message:'Delete failed'})
    }
})

userRouter.post('/refresh',async(req,res)=>{
    const old_refresh_token = req.cookies.refreshToken

    if(!old_refresh_token) return res.status(401).json({message:"No refresh Token"})

    try{
        const payload = jwt.verify(old_refresh_token,process.env.JWT_REFRESH_SECRET)
        const user = await userModel.findById(payload.id)

        if(!user) return res.status(403).json({message:"Invalid User"})
        
        const tokenExists = user.tokens.some(t=> t.refreshToken === old_refresh_token)
        if(!tokenExists){
            return res.status(403).json({message:"Invalid Refresh Token"})
        }

        user.tokens = user.tokens.filter(t=>t.refreshToken !== old_refresh_token)

        const {refreshToken,accessToken} = createToken(user._id,user.role)

        user.tokens.push({
            refreshToken:refreshToken,
            userAgent: req.headers["user-agent"]
        })

        await user.save()

        res.cookie('refreshToken',refreshToken,{
            httpOnly: true,
            sameSite:"Strict",
            secure:false,
            maxAge: 7 * 24 * 60 * 60 *1000
        })

        console.log("Token refreshed")
        res.status(200).json({success:true,accessToken,message:"refresh success"})

    }catch(err){
        console.log("Refresh Token Error: ",err)

        const user = await userModel.findOne({"tokens.refreshToken":old_refresh_token});
        if(user){
            user.tokens = user.tokens.filter(t=>t.refreshToken !== old_refresh_token);
            await user.save();
        }
        return res.status(403).json({message:"Refresh token expired or invalid"})
    }
})

export default userRouter;