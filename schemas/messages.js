const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    messageContent: {
      type: {
        type: String,
        enum: ["file", "text"],
        required: true,
      },
      text: {
        type: String,
        required: true,
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
    collection: "messages",
  }
);

module.exports = mongoose.model("Message", messageSchema);
