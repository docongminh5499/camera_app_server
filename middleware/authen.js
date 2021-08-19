const config = process.env;
const jwt = require("jsonwebtoken");
const User = require("../model/user");

const verifyToken = async (req, res, next) => {
    const token = req.body.token || req.query.token || req.headers["x-access-token"];
    if (!token) return res.status(403).send("A token is required for authentication");

    try {
        const decoded = jwt.verify(token, config.TOKEN_KEY);
        const user = await User.findOne({ _id: decoded._id });
        if (!user)
            return res.status(401).send("Your account is revoked.");
        req.user = decoded;
    } catch (err) {
        return res.status(401).send("Invalid token");
    }
    return next();
};

module.exports = verifyToken;