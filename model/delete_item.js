const mongoose = require("mongoose");

const deleteSchema = new mongoose.Schema({
    _id: { type: mongoose.Schema.Types.ObjectId, ref: 'picture' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },
    deletedTime: { type: Date, required: true },
});

module.exports = mongoose.model("delete_item", deleteSchema);