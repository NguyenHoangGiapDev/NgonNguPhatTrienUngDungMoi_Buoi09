
const express = require("express");
const multer = require("multer");
const path = require("path");
const { checkLogin } = require("../utils/authHandler");
const messageController = require("../controllers/messages");

const router = express.Router();

// Generic file upload (any mimetype) stored in /uploads
// Store any file type in /uploads with a unique name
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + "-" + Math.round(Math.random() * 1e9) + ext);
  },
});
const uploadAny = multer({ storage });

// Lấy toàn bộ hội thoại 2 chiều với userId
// Get full two-way conversation with a user
router.get("/:userId", checkLogin, messageController.getConversation);

// Gửi tin nhắn: nếu có file -> type=file, text=đường dẫn; nếu không -> text
router.post(
  "/:userId",
  checkLogin,
  // dùng .any() để tránh lỗi "Unexpected field" khi Postman gửi field khác
  uploadAny.any(),
  messageController.createMessage
);
// Send a message (text or file). Using .any() avoids "Unexpected field" errors.
router.post("/:userId", checkLogin, uploadAny.any(), messageController.createMessage);

// Lấy tin nhắn cuối cùng của mỗi cuộc trò chuyện liên quan đến user hiện tại
// Get last message of each conversation of current user
router.get("/", checkLogin, messageController.getLastMessages);

module.exports = router;
module.exports = router;