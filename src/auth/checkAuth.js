// Check if user is logged in or not
module.exports = (req, res, next) => {
	if (req.isAuthenticated()) return next();
	req.session.backURL = req.url;
	res.redirect('/login');
};
