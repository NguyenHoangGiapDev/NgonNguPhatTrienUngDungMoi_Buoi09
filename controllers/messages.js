const mongoose = require("mongoose");
const Message = require("../schemas/messages");

module.exports = {
  // GET /api/v1/messages/:userId
  async getConversation(req, res, next) {
    try {
      const currentUserId = req.user._id;
      const otherUserId = req.params.userId;

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
      const otherUserId = req.params.userId;
      const isFile = Boolean(req.file);

      const message = await Message.create({
        from: currentUserId,
        to: otherUserId,
        messageContent: {
          type: isFile ? "file" : "text",
          text: isFile ? req.file.path : req.body.text,
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
          },
        },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: "$partner",
            lastMessage: { $first: "$$ROOT" },
          },
        },
        { $replaceRoot: { newRoot: "$lastMessage" } },
        { $sort: { createdAt: -1 } },
      ]);

      res.send(data);
    } catch (error) {
      next(error);
    }
  },
};
