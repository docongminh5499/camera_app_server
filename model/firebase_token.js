const mongoose = require("mongoose");

const firebaseTokenSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
    firebaseToken: { type: String, required: true }
});

module.exports = mongoose.model("firebase_token", firebaseTokenSchema);