import jwt from "jsonwebtoken";

const authMiddleware = async (req,res,next)=>{
    
    const token = req.headers.authorization.split(" ")[1];
    if (!token) {
        return res.json({success:false,message:"Not Authorized login Again"});
    }

    try {
        const token_decode=jwt.verify(token,process.env.JWT_ACCESS_SECRET);
        req.userId=token_decode.id;
        req.role = token_decode.role;

        next();
    } catch (error) {
        console.log(error);
        res.status(401).json({success:false,message:"Token Expired"})
    }
}

export const adminAuthMiddleware =  async (req,res,next)=>{
    
    const token = req.headers.authorization.split(" ")[1];
    if (!token) {
        return res.json({success:false,message:"Not Authorized login Again"});
    }

    try {

        const token_decode=jwt.verify(token,process.env.JWT_ACCESS_SECRET);
        req.userId=token_decode.id;
        req.role = token_decode.role;

        if(req.role !=='admin'){
           return res.status(403).json({success:false,message:"Access Denied"})
        }

        next();
        
    } catch (error) {
        console.log(error);
        res.status(401).json({success:false,message:"Token Expired"})
    }
} 



export default authMiddleware;