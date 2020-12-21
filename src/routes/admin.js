const express = require('express'),
	router = express.Router();

// Admin page
router.get('/', async function(req, res) {
	res.render('navbar/admin', {
		bot: req.bot,
		auth: req.isAuthenticated() ? true : false,
		user: req.isAuthenticated() ? req.user : null,
	});
});

module.exports = router;
