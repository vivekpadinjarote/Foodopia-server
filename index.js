import express from "express";
import cookieParser from "cookie-parser"
import cors from "cors"
import { connectDB } from "./database/db.js"
import foodRouter from "./routes/foodRoute.js"
import userRouter from "./routes/userRoute.js"
import dotenv from 'dotenv'
import cartRouter from "./routes/cartRoute.js"
import { initSocket } from "./utils/socket.js";
import http from 'http'
import { Server } from "socket.io";
import orderRouter from "./routes/orderRoute.js";

const app = express()
dotenv.config()
const port = 4000

const server = http.createServer(app);
const io = new Server(server,{
    cors:{
        origin:'http://localhost:3000',
        credentials:true,
    }
})


app.use(express.json())

app.use(cors({origin:'http://localhost:3000',
    credentials:true,
}))
app.use(cookieParser())

// DB  Connection
connectDB();

app.set('io',io)
initSocket(io)


// api endpoint
 app.use("/api/food",foodRouter)
 app.use("/api/user",userRouter)
 app.use("/api/cart",cartRouter)
 app.use("/api/order",orderRouter) // Serve static files from 'uploads' directory

app.get("/",(req,res)=>{
    res.send("API Working ")
})

server.listen(port,()=>{
    console.log(`Server Started on http://localhost:${port}`)
})