const adminAuthorization = (req, res, next) => {
    if (!req.user || (req.user && !req.user.admin))
        return res.status(401).send("Permission denied");
    return next();
};

module.exports = adminAuthorization;