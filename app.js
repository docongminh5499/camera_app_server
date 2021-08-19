require("dotenv").config();
require("./config/database").connect();

const User = require("./model/user");
const authen = require("./middleware/authen");
const adminAuth = require("./middleware/admin_auth");

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const multer = require("multer");
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
            return res.status(200).json({ jwt: token, username: username, password: password, admin: user.admin });
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
// Analysis image
app.post("/analysis-image", multer({
    storage: multer.diskStorage({
        destination: function (req, file, cb) {
            cb(null, 'analysis_image/')
        },
        filename: function (req, file, cb) {
            cb(null, req.user._id + "-" + Date.now() + ".jpg")
        }
    }),
}).single("image"), (req, res, next) => {
    return res.status(200).send("Successfully");
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