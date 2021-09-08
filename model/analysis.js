const mongoose = require("mongoose");

const analysisSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
    data: { type: String, required: true },
    analysisTime: { type: Date, required: true }
});

module.exports = mongoose.model("analysis", analysisSchema);