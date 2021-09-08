const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
    message: { type: String, required: true },
    sendTime: { type: Date, required: true },
    read: { type: Boolean, required: true },
    open: { type: Boolean, required: true },
});

module.exports = mongoose.model("message", messageSchema);