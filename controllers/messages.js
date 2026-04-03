
const mongoose = require("mongoose");
const Message = require("../schemas/messages");
const User = require("../schemas/users");

// helper: validate and normalize userId param
// Validate and normalize userId from params
async function getValidUserId(paramId) {
  if (!mongoose.Types.ObjectId.isValid(paramId)) {
    return null;
  }
  if (!mongoose.Types.ObjectId.isValid(paramId)) return null;
  const user = await User.findById(paramId).select("_id");
  return user ? user._id : null;
}

module.exports = {
  // GET /api/v1/messages/:userId
  async getConversation(req, res, next) {
    try {
      const currentUserId = req.user._id;
      const otherUserId = await getValidUserId(req.params.userId);

      if (!otherUserId) {
        return res.status(400).send({ message: "userId không hợp lệ hoặc không tồn tại" });
        return res.status(400).send({ message: "userId khong hop le hoac khong ton tai" });
      }

      const messages = await Message.find({
        $or: [
          { from: currentUserId, to: otherUserId },
          { from: otherUserId, to: currentUserId },
        ],
      })
        .sort({ createdAt: 1 })
        .populate("from to", "username email");

      res.send(messages);
    } catch (error) {
      next(error);
    }
  },

  // POST /api/v1/messages/:userId
  async createMessage(req, res, next) {
    try {
      const currentUserId = req.user._id;
      const otherUserId = await getValidUserId(req.params.userId);
      if (!otherUserId) {
        return res.status(400).send({ message: "userId không hợp lệ hoặc không tồn tại" });
        return res.status(400).send({ message: "userId khong hop le hoac khong ton tai" });
      }

      // chấp nhận cả uploadAny.single('file') hoặc uploadAny.any()
      // Accept both uploadAny.single('file') and uploadAny.any()
      const file = req.file || (req.files && req.files[0]) || null;
      const isFile = Boolean(file);

      if (!isFile && !req.body.text) {
        return res.status(400).send({ message: "Thiếu nội dung text hoặc file" });
        return res.status(400).send({ message: "Thieu noi dung text hoac file" });
      }

      const message = await Message.create({
        from: currentUserId,
        to: otherUserId,
        messageContent: {
          type: isFile ? "file" : "text",
          text: isFile ? file.path : req.body.text,
        },
      });

      await message.populate("from to", "username email");
      res.status(201).send(message);
    } catch (error) {
      next(error);
    }
  },

  // GET /api/v1/messages/
  async getLastMessages(req, res, next) {
    try {
      const currentUserId = new mongoose.Types.ObjectId(req.user._id);

      const data = await Message.aggregate([
        { $match: { $or: [{ from: currentUserId }, { to: currentUserId }] } },
        {
          $match: {
            $or: [{ from: currentUserId }, { to: currentUserId }],
          },
        },
        {
          $addFields: {
            partner: {
              $cond: [{ $eq: ["$from", currentUserId] }, "$to", "$from"],
            },
            partner: { $cond: [{ $eq: ["$from", currentUserId] }, "$to", "$from"] },
          },
        },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: "$partner",
            lastMessage: { $first: "$$ROOT" },
          },
        },
        { $group: { _id: "$partner", lastMessage: { $first: "$$ROOT" } } },
        { $replaceRoot: { newRoot: "$lastMessage" } },
        { $sort: { createdAt: -1 } },
      ]);

      res.send(data);
    } catch (error) {
      next(error);
    }
  },
};