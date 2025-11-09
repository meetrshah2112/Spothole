// routes/potholeRoutes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const Pothole = require("../models/Pothole");
const { verifyToken, isAdmin } = require("../middleware/auth");

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, "../public/uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "pothole-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error("Only image files are allowed!"));
  },
});

// @route   POST /api/potholes/register
// @desc    Register new pothole
// @access  Private (User & Admin)
router.post(
  "/register",
  verifyToken,
  upload.single("image"),
  async (req, res) => {
    try {
      const {
        distance,
        longitude,
        latitude,
        vehicle_name,
        vehicle_ground_level,
      } = req.body;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Image is required",
        });
      }

      const pothole = await Pothole.create({
        distance: parseFloat(distance),
        image: `/public/uploads/${req.file.filename}`,
        gps: {
          longitude: parseFloat(longitude),
          latitude: parseFloat(latitude),
        },
        vehicle_name,
        vehicle_ground_level: parseFloat(vehicle_ground_level),
        reportedBy: req.user._id,
      });

      res.status(201).json({
        success: true,
        message: "Pothole registered successfully",
        data: pothole,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// @route   GET /api/potholes/list
// @desc    Get list of potholes
// @access  Private (User & Admin)
router.get("/list", verifyToken, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const query = {};
    if (status) {
      query.pothole_status = status;
    }

    const potholes = await Pothole.find(query)
      .populate("reportedBy", "name email")
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const count = await Pothole.countDocuments(query);

    res.json({
      success: true,
      data: potholes,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalRecords: count,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   GET /api/potholes/:id
// @desc    Get single pothole details
// @access  Private (User & Admin)
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const pothole = await Pothole.findById(req.params.id).populate(
      "reportedBy",
      "name email"
    );

    if (!pothole) {
      return res.status(404).json({
        success: false,
        message: "Pothole not found",
      });
    }

    res.json({
      success: true,
      data: pothole,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   PUT /api/potholes/update/:id
// @desc    Update pothole status
// @access  Private (Admin only)
router.put("/update/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const { pothole_status } = req.body;

    if (!["pending", "inprocess", "completed"].includes(pothole_status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    const pothole = await Pothole.findByIdAndUpdate(
      req.params.id,
      { pothole_status, updatedAt: Date.now() },
      { new: true, runValidators: true }
    );

    if (!pothole) {
      return res.status(404).json({
        success: false,
        message: "Pothole not found",
      });
    }

    res.json({
      success: true,
      message: "Pothole status updated successfully",
      data: pothole,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// @route   DELETE /api/potholes/:id
// @desc    Delete pothole
// @access  Private (Admin only)
router.delete("/:id", verifyToken, isAdmin, async (req, res) => {
  try {
    const pothole = await Pothole.findById(req.params.id);

    if (!pothole) {
      return res.status(404).json({
        success: false,
        message: "Pothole not found",
      });
    }

    // Delete image file
    const imagePath = path.join(__dirname, "..", pothole.image);
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }

    await pothole.deleteOne();

    res.json({
      success: true,
      message: "Pothole deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

module.exports = router;
