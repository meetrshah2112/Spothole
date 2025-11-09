// models/Pothole.js
const mongoose = require("mongoose");

const potholeSchema = new mongoose.Schema({
  distance: {
    type: Number,
    required: true,
  },
  image: {
    type: String,
    required: true,
  },
  gps: {
    longitude: {
      type: Number,
      required: true,
    },
    latitude: {
      type: Number,
      required: true,
    },
  },
  vehicle_name: {
    type: String,
    required: true,
  },
  vehicle_ground_level: {
    type: Number,
    required: true,
  },
  pothole_status: {
    type: String,
    enum: ["pending", "inprocess", "completed"],
    default: "pending",
  },
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field before saving
potholeSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Pothole", potholeSchema);
