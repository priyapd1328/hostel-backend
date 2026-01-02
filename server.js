const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

// FIX 1: Dynamic CORS for Production
// When you deploy your frontend, replace "*" with your Vercel URL for better security
const io = new Server(server, { 
  cors: { 
    origin: "*", 
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"] 
  } 
});

app.use(cors());
app.use(express.json());

app.set("socketio", io);

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log(err));

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/complaints", require("./routes/complaintRoutes"));

io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);
});

// FIX 2: Dynamic Port for Deployment
// Render/Heroku will assign a port via process.env.PORT. 5000 is only for local use.
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));