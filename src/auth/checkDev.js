// Dependecies
const config = require('../config.js');

// This checks if the user is a bot Dev or not
module.exports = async (req, res, next) => {
	if (req.isAuthenticated() && req.user.id === config.ownerID) return next();
	req.session.backURL = req.originalURL;
	res.redirect('/');
};
