const express = require("express");
const router = express.Router();
const Complaint = require("../models/Complaint");
const axios = require("axios");

// 1. POST: Submit a new complaint
router.post("/add", async (req, res) => {
  try {
    const { title, description, createdBy } = req.body;
    const mlResponse = await axios.post("http://127.0.0.1:5001/predict", { text: description });
    const { category, urgency } = mlResponse.data;

    const complaint = new Complaint({ title, description, category, urgency, createdBy });
    await complaint.save();

    const io = req.app.get("socketio");
    if (io) io.emit("new_complaint", { message: "New Issue Reported", category, urgency, title });

    res.status(201).json({ message: "Success", complaint });
  } catch (error) {
    res.status(500).json({ error: "Backend failed to reach ML server" });
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

// --- NEW ADDITION: Feature 1 - Student History ---
// 3. GET: Fetch complaints for a specific user (Student View)
router.get("/user/:userId", async (req, res) => {
  try {
    const history = await Complaint.find({ createdBy: req.params.userId }).sort({ createdAt: -1 });
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user history" });
  }
});

// 4. PATCH: Update a complaint's status (Generic)
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