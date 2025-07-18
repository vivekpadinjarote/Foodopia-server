import {v2 as cloudinary} from "cloudinary";
import {CloudinaryStorage} from "multer-storage-cloudinary";
import dotenv from "dotenv";

dotenv.config()

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})

const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'profile-pics',
        allowed_formats:["jpeg","jpg","png"],
        transformation:[{width:300,height:300,crop:"limit"}]
    }
})

const storage_food_image = new CloudinaryStorage({
    cloudinary,
    params:{
        folder:'food-images',
        allowed_formats:['jpeg',"jpg",'png'],
        transformation:[{width:300,height:300,crop:'limit'}]
    }
})

export {cloudinary, storage, storage_food_image}