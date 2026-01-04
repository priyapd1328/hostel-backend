const express = require("express");
const router = express.Router();
const Complaint = require("../models/Complaint");
const axios = require("axios");

// 1. POST: Submit a new complaint (UPDATED WITH FALLBACK)
router.post("/add", async (req, res) => {
  try {
    const { title, description, createdBy } = req.body;
    
    // Default values if the AI server (on your laptop) can't be reached
    let category = "General";
    let urgency = "Medium";

    try {
      // Trying to reach the ML server (localhost). 
      // On Render, this will fail because your laptop isn't the internet.
      const mlResponse = await axios.post("http://127.0.0.1:5001/predict", 
        { text: description }, 
        { timeout: 2000 } // Don't wait more than 2 seconds
      );
      category = mlResponse.data.category;
      urgency = mlResponse.data.urgency;
    } catch (mlErr) {
      // Instead of crashing the whole site, we just log the error and use defaults
      console.log("ML Server offline or unreachable. Using default tags.");
    }

    const complaint = new Complaint({ title, description, category, urgency, createdBy });
    await complaint.save();

    const io = req.app.get("socketio");
    if (io) io.emit("new_complaint", { message: "New Issue Reported", category, urgency, title });

    res.status(201).json({ message: "Success", complaint });
  } catch (error) {
    console.error("Database Save Error:", error);
    res.status(500).json({ error: "Backend failed to save complaint" });
  }
});

// 2. GET: Fetch all complaints (Warden View)
router.get("/all", async (req, res) => {
  try {
    const complaints = await Complaint.find().sort({ createdAt: -1 });
    res.json(complaints);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch complaints" });
  }
});

// 3. GET: Fetch complaints for a specific user (Student View)
router.get("/user/:userId", async (req, res) => {
  try {
    const history = await Complaint.find({ createdBy: req.params.userId }).sort({ createdAt: -1 });
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user history" });
  }
});

// 4. PATCH: Update a complaint's status
router.patch("/update-status/:id", async (req, res) => {
  try {
    const { status } = req.body;
    const updatedComplaint = await Complaint.findByIdAndUpdate(req.params.id, { status }, { new: true });
    const io = req.app.get("socketio");
    if (io) io.emit("status_updated", { id: req.params.id, status, message: `Status updated to ${status}` });
    res.json(updatedComplaint);
  } catch (err) {
    res.status(500).json({ error: "Failed to update status" });
  }
});

// 5. GET: Analytics
router.get("/stats", async (req, res) => {
  try {
    const stats = await Complaint.aggregate([{ $group: { _id: "$category", count: { $sum: 1 } } }]);
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

// 6. PUT: Specifically for the Resolve button
router.put("/:id/resolve", async (req, res) => {
  try {
    const updatedComplaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { status: "Resolved" },
      { new: true }
    );
    const io = req.app.get("socketio");
    if (io) {
      io.emit("status_updated", {
        id: req.params.id,
        status: "Resolved",
        message: `Your complaint "${updatedComplaint.title}" has been Resolved`
      });
    }
    res.json(updatedComplaint);
  } catch (err) {
    res.status(500).json({ error: "Failed to resolve complaint" });
  }
});

module.exports = router;