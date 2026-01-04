const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const app = express();
const server = http.createServer(app);

// 1. Updated CORS for Production
const allowedOrigins = [
  "https://hostel-frontend-coral.vercel.app", // Your Vercel URL
  "http://localhost:3000" // Keep local testing working
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error("CORS policy violation"), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE"]
}));

const io = new Server(server, { 
  cors: { 
    origin: "https://hostel-frontend-coral.vercel.app",
    methods: ["GET", "POST"],
    credentials: true
  } 
});

app.use(express.json());
app.set("socketio", io);

// 2. Optimized MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected Successfully"))
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1); // Stop server if DB fails
  });

// Routes
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/complaints", require("./routes/complaintRoutes"));

// Root route for health check
app.get("/", (req, res) => {
  res.send("Hostel Backend is Live and Running!");
});

io.on("connection", (socket) => {
  console.log("User Connected:", socket.id);
});

// 3. Dynamic Port for Render
const PORT = process.env.PORT || 10000; 
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});