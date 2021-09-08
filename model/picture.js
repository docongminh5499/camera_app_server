const mongoose = require("mongoose");

const pictureSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
    data: { type: String, required: true },
    lastModifyTime: { type: Date, required: true },
});

module.exports = mongoose.model("picture", pictureSchema);