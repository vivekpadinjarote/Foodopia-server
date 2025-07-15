    import jwt from 'jsonwebtoken'

    const userSocketMap = new Map();

    export const initSocket = (io)=>{
        io.use((socket,next)=>{
            const token = socket.handshake.auth?.token;

            if(!token){
                return next(new Error("No token provided"))
            }

            try{
                const token_decode = jwt.verify(token,process.env.JWT_ACCESS_SECRET);
                socket.userId = token_decode.id;
                socket.userRole = token_decode.role
                next(); 
            }catch(err){
                console.error("Socket auth error:", err.message);
                if (err.name === "TokenExpiredError") {
                    return next(new Error("TokenExpired")); 
                }
                next(new Error("Authentication Error"))
            }
        })

        io.on("connection",(socket)=>{
            console.log(`Socket Connected: ${socket.id} | User: ${socket.userId}`)

            if (!userSocketMap[socket.userId]) userSocketMap[socket.userId] = [];
            userSocketMap[socket.userId].push(socket.id);

            socket.broadcast.to(socket.userId).emit("otherDeviceConnected");

            socket.join(socket.userId);

            socket.on("disconnect",()=>{
                console.log("Socket Disconnected",socket.id)
                userSocketMap[socket.userId] = userSocketMap[socket.userId]?.filter(id => id !== socket.id);
                if (userSocketMap[socket.userId]?.length === 0) delete userSocketMap[socket.userId];
            })
        })
    }

    export const emitToUser = (io, userId, event, data) => {
    io.to(userId).emit(event, data);
    };  