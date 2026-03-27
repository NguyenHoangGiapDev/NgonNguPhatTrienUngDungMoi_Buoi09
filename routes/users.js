const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const usersController = require("../controllers/users");

const router = express.Router();

const uploadDir = path.join(__dirname, "../uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "users-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

router.post("/import", upload.any(), (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Khong tim thay file upload",
      });
    }

    const uploadedFile = req.files.find((f) => f.fieldname.trim() === "file");

    if (!uploadedFile) {
      return res.status(400).json({
        success: false,
        message: "Field file khong dung",
      });
    }

    const ext = path.extname(uploadedFile.originalname).toLowerCase();
    if (ext !== ".csv") {
      return res.status(400).json({
        success: false,
        message: "Chi chap nhan file CSV",
      });
    }

    req.file = uploadedFile;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
}, usersController.importUsersFromCsv);

module.exports = router;