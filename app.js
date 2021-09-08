require("dotenv").config();
require("./config/database").connect();

const User = require("./model/user");
const Picture = require("./model/picture");
const DeleteItem = require("./model/delete_item");
const Analysis = require("./model/analysis");
const Message = require('./model/message');
const FirebaseToken = require('./model/firebase_token');
const authen = require("./middleware/authen");
const adminAuth = require("./middleware/admin_auth");
const sendNotification = require('./utils/send_notification');

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const express = require("express");
const bodyParser = require("body-parser");
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }))

// Login
app.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!(username && password))
            return res.status(404).send("All input is required");

        const user = await User.findOne({ username });
        if (user && (await bcrypt.compare(password, user.password))) {
            const token = jwt.sign(
                { _id: user._id, username: user.username, admin: user.admin },
                process.env.TOKEN_KEY
            );
            return res.status(200).json({
                jwt: token,
                _id: user.id,
                username: username,
                password: password,
                admin: user.admin,
            });
        }
        return res.status(404).send("Invalid credentials");
    } catch (err) {
        console.log(err);
        return res.status(500).send("Internal server error");
    }
});

app.use(authen);
// Verify-token
app.post("/verify-token", (req, res) => {
    res.status(200).json({ ...req.user, jwt: req.body.token });
});

// Register-firebase-token
app.post('/register-firebase-token', async (req, res) => {
    try {
        const { firebaseToken } = req.body;
        if (!firebaseToken)
            return res.status(404).send("All input is required");
        var token = await FirebaseToken.findOne({
            userId: req.user._id,
            firebaseToken: firebaseToken,
        });
        if (!token) {
            token = await FirebaseToken.create({
                userId: req.user._id,
                firebaseToken: firebaseToken,
            });
        }
        return res.status(200).json(token);
    } catch (err) {
        console.log(err);
        return res.status(500).send("Internal server error");
    }
});

// Remove-firebase-token
app.post('/remove-firebase-token', async (req, res) => {
    try {
        const { firebaseToken } = req.body;
        if (!firebaseToken)
            return res.status(404).send("All input is required");
        var token = await FirebaseToken.findOne({
            userId: req.user._id,
            firebaseToken: firebaseToken,
        });
        if (token) await token.remove();
        return res.status(200).send("Remove successfully");
    } catch (err) {
        console.log(err);
        return res.status(500).send("Internal server error");
    }
});

// Send-notification
app.post('/send-notification', async (req, res) => {
    try {
        const { receiverId, message } = req.body;
        if (!receiverId || !message)
            return res.status(404).send("All input is required");

        const receiver = await User.findOne({ _id: receiverId });
        if (!receiver)
            return res.status(404).send("Receive-person not found");

        var firebaseTokens = await FirebaseToken.find({ userId: receiverId });
        firebaseTokens = firebaseTokens.map(element => element.firebaseToken);
        sendNotification(firebaseTokens);

        var now = new Date();
        await Message.create({
            receiverId: receiverId,
            senderId: req.user._id,
            message: message,
            sendTime: now.toISOString(),
            read: false,
            open: false,
        });
        return res.status(200).send('Send successfully');
    } catch (err) {
        console.log(err);
        return res.status(500).send("Internal server error");
    }
});

// Read-notification
app.post('/read-notification', async (req, res) => {
    try {
        const { messageId } = req.body;
        if (!messageId)
            return res.status(404).send("All input is required");
        var message = await Message.findOne({ _id: messageId });
        if (!message)
            return res.status(404).send("Message not found");
        if (message.receiverId != req.user._id)
            return res.status(401).send("Permission denied");
        message.read = true;
        await message.save();
        return res.status(200).send("Update successfully");
    } catch (err) {
        console.log(err);
        return res.status(500).send("Internal server error");
    }
});

// Have unopen notification
app.post('/check-unopen-notification', async (req, res) => {
    try {
        const message = await Message.find({ receiverId: req.user._id, open: false });
        return res.status(200).json({ count: message.length });
    } catch (err) {
        console.log(err);
        return res.status(500).send("Internal server error");
    }
});

// Open all notification
app.post('/open-all-notification', async (req, res) => {
    try {
        await Message.updateMany(
            { receiverId: req.user._id, open: false },
            { "$set": { "open": true } },
        );
        return res.status(200).json({ status: true });
    } catch (err) {
        console.log(err);
        return res.status(500).send("Internal server error");
    }
});

// Get notification
app.post('/get-notification', async (req, res) => {
    try {
        const { limit = 5, skip = 0 } = req.body;
        const messages = await Message
            .find({ receiverId: req.user._id })
            .sort({ "sendTime": -1 })
            .skip(parseInt(skip))
            .limit(parseInt(limit))
            .populate('senderId', '_id username')
            .exec();
        return res.status(200).json({ data: messages });
    } catch (err) {
        console.log(err);
        return res.status(500).send("Internal server error");
    }
});

// Analysis-image
app.post("/analysis-image", async (req, res) => {
    try {
        const { userId, data, analysisTime } = req.body;
        if (!userId || !data || !analysisTime)
            return res.status(400).send("All input is required");
        if (userId != req.user._id)
            return res.status(401).send("Permission denied");

        const analysis = await Analysis.create({
            userId: userId,
            data: data,
            analysisTime: new Date(analysisTime)
        });
        return res.status(200).json(analysis);
    } catch (err) {
        console.log(err);
        res.status(500).send("Internal server error");
    }
});

// Sync create picture
app.post("/sync-create", async (req, res) => {
    try {
        const { id, userId, data, lastModifyTime } = req.body;
        if (!userId || !data || !lastModifyTime)
            return res.status(400).send("All input is required");
        if (userId != req.user._id)
            return res.status(401).send("Permission denied");
        const picture = await Picture.create({
            userId: userId,
            data: data,
            lastModifyTime: new Date(lastModifyTime),
        });
        return res.status(200).json({ serverId: picture._id, id, userId, data, lastModifyTime });
    } catch (err) {
        console.log(err);
        res.status(500).send("Internal server error");
    }
});

// Sync delete picture
app.post("/sync-delete", async (req, res) => {
    try {
        const { id, serverId, userId, deletedTime } = req.body;
        if (!serverId || !userId || !deletedTime)
            return res.status(400).send("All input is required");
        if (userId != req.user._id)
            return res.status(401).send("Permission denied");

        const picture = await Picture.findOne({ _id: serverId });
        if (picture != null) {
            await DeleteItem.create({
                _id: serverId,
                userId: userId,
                deletedTime: deletedTime,
            });
            await Picture.findOneAndRemove({ _id: serverId });
        }
        return res.status(200).json({ id, serverId, userId, deletedTime });
    } catch (err) {
        console.log(err);
        res.status(500).send("Internal server error");
    }
});

// Require sync
app.post('/require-sync-create', async (req, res) => {
    try {
        const { start, end } = req.body;
        if (!start || !end)
            return res.status(400).send("All input is required");
        const pictures = await Picture.find({
            userId: req.user._id,
            lastModifyTime: {
                $gte: new Date(start),
                $lt: new Date(end),
            }
        });
        return res.status(200).json({
            created: pictures.map(element => ({
                id: 0,
                serverId: element._id,
                userId: element.userId,
                data: element.data,
                lastModifyTime: element.lastModifyTime,
            })),
        });
    } catch (err) {
        console.log(err);
        res.status(500).send("Internal server error");
    }
});

app.post('/require-sync-delete', async (req, res) => {
    try {
        const { start, end } = req.body;
        if (!start || !end)
            return res.status(400).send("All input is required");
        const deletes = await DeleteItem.find({
            userId: req.user._id,
            deletedTime: {
                $gte: new Date(start),
                $lt: new Date(end),
            }
        });
        return res.status(200).json({
            deleted: deletes.map(element => ({
                id: 0,
                serverId: element._id,
                userId: element.userId,
                deletedTime: element.deletedTime,
            }))
        });
    } catch (err) {
        console.log(err);
        res.status(500).send("Internal server error");
    }
});

// Get picture 
app.post('/get-picture', async (req, res) => {
    try {
        const { limit = 5, skip = 0 } = req.body;
        const pictures = await Picture
            .find({ userId: req.user._id })
            .sort({ "lastModifyTime": -1 })
            .skip(parseInt(skip))
            .limit(parseInt(limit))
            .exec();
        const convertedPictures = pictures.map(element => ({
            id: 0,
            serverId: element._id,
            userId: req.user._id,
            data: element.data,
            lastModifyTime: element.lastModifyTime,
        }));
        return res.status(200).json({ data: convertedPictures });
    } catch (err) {
        console.log(err);
        res.status(500).send("Internal server error");
    }
});

// Save image from camera
app.post("/save-image", async (req, res) => {
    try {
        const { userId, data, lastModifyTime } = req.body;
        if (!userId || !data || !lastModifyTime)
            return res.status(400).send("All input is required");
        if (userId != req.user._id)
            return res.status(401).send("Permission denied");

        const picture = await Picture.create({
            userId: userId,
            data: data,
            lastModifyTime: new Date(lastModifyTime),
        });
        return res.status(200).json(picture);
    } catch (err) {
        console.log(err);
        res.status(500).send("Internal server error");
    }
});

// Delete image
app.post("/delete-image", async (req, res) => {
    try {
        const { userId, serverId, deletedTime } = req.body;
        if (!userId || !serverId || !deletedTime)
            return res.status(400).send("All input is required");
        if (userId != req.user._id)
            return res.status(401).send("Permission denied");

        await Picture.findOneAndRemove({ _id: serverId });
        const deletedItem = await DeleteItem.create({
            _id: serverId,
            userId: userId,
            deletedTime: new Date(deletedTime),
        });
        return res.status(200).json(deletedItem);
    } catch (err) {
        console.log(err);
        res.status(500).send("Internal server error");
    }
});

app.use(adminAuth);
// Get-Account
app.post("/get-account", async (req, res) => {
    try {
        const accounts = await User.find({ 'createdBy': req.user._id });
        return res.status(200).json({ accounts: accounts });
    } catch (err) {
        console.log(err);
        res.status(500).send("Internal server error");
    }
});

// Add-account
app.post("/add-account", async (req, res) => {
    try {
        const { username, password, admin } = req.body;
        if (!(username && password && admin != undefined))
            return res.status(400).send("All input is required");

        const oldUser = await User.findOne({ username });
        if (oldUser)
            return res.status(409).send("User already exist. Please try another account");

        encryptedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            username,
            password: encryptedPassword,
            admin: admin,
            createdBy: req.user._id
        });
        return res.status(200).json(user);
    } catch (err) {
        console.log(err);
        res.status(500).send("Internal server error");
    }
});

// Modify-account
app.post("/modify-account", async (req, res) => {
    try {
        const { id, username, admin } = req.body;
        if (!(id && username && admin != undefined))
            return res.status(400).send("All input is required");

        const user = await User.findOne({ _id: id });
        if (!user)
            return res.status(404).send("User not found");

        const oldUser = await User.findOne({ username });
        if (oldUser && oldUser._id.toString() != user._id.toString())
            return res.status(409).send("User already exist. Please try another account");

        if (user.createdBy != req.user._id)
            return res.status(401).send("Permission denied");

        user.username = username;
        user.admin = admin;
        await user.save();
        return res.status(200).json(user);
    } catch (err) {
        console.log(err);
        res.status(500).send("Internal server error");
    }

});

// Remove-account
app.post("/remove-account", async (req, res) => {
    try {
        const { id } = req.body;
        if (!id)
            return res.status(400).send("All input is required");

        const user = await User.findOne({ _id: id });
        if (!user)
            return res.status(404).send("User not found");
        if (user.createdBy != req.user._id)
            return res.status(401).send("Permission denied");

        const currentManagedUser = await User.findOne({ createdBy: user._id });
        if (currentManagedUser)
            return res.status(409).send("You need to delete all account under-controls of the account you want to remove");

        await User.findOneAndRemove({ _id: id });
        return res.status(200).json(user);
    } catch (err) {
        console.log(err);
        res.status(500).send("Internal server error");
    }
});

module.exports = app;