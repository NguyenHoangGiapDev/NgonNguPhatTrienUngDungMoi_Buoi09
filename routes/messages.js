const express = require("express");
const multer = require("multer");
const path = require("path");
const { checkLogin } = require("../utils/authHandler");
const messageController = require("../controllers/messages");

const router = express.Router();

// Generic file upload (any mimetype) stored in /uploads
const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + "-" + Math.round(Math.random() * 1e9) + ext);
  },
});
const uploadAny = multer({ storage });

// Lấy toàn bộ hội thoại 2 chiều với userId
router.get("/:userId", checkLogin, messageController.getConversation);

// Gửi tin nhắn: nếu có file -> type=file, text=đường dẫn; nếu không -> text
router.post(
  "/:userId",
  checkLogin,
  uploadAny.single("file"),
  messageController.createMessage
);

// Lấy tin nhắn cuối cùng của mỗi cuộc trò chuyện liên quan đến user hiện tại
router.get("/", checkLogin, messageController.getLastMessages);

module.exports = router;
