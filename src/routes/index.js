const express = require('express'),
	router = express.Router(),
	fetch = require('node-fetch'),
	url = require('url'),
	config = require('../config.js'),
	passport = require('passport'),
	{ Strategy } = require('passport-discord');

// Get IP and location (for logging)
async function getIP(req) {
	const IP = req.connection.remoteAddress.slice(7);
	const country = await fetch(`http://api.db-ip.com/v2/free/${IP}`).then(info => info.json());
	if (IP != '86.25.177.233') {
		return country;
	}
}
// Works in background for user storage
passport.serializeUser((user, done) => {
	done(null, user);
});
passport.deserializeUser((obj, done) => {
	done(null, obj);
});

// Discord Ouath2 data
console.log(config.BotID);
passport.use(new Strategy({
	clientID: config.BotID,
	clientSecret: config.client,
	callbackURL: `${config.domain}/callback`,
	scope: ['identify', 'guilds'],
}, (accessToken, refreshToken, profile, done) => {
	process.nextTick(() => done(null, profile));
}));

// Home page
router.get('/', async function(req, res) {
	res.render('index', {
		bot: req.bot,
		auth: req.isAuthenticated() ? true : false,
		user: req.isAuthenticated() ? req.user : null,
	});
	const country = await getIP(req);
	console.log(`Connection IP: ${country.ipAddress}, Location:${country.city}, ${country.countryName}.`);
});

// login page
router.get('/login', (req, res, next) => {
	// We determine the returning url.
	if (req.session.backURL) {
		req.session.backURL = req.session.backURL; // eslint-disable-line no-self-assign
	} else if (req.headers.referer) {
		const parsed = url.parse(req.headers.referer);
		if (parsed.hostname === config.domain) {
			req.session.backURL = parsed.path;
		}
	} else {
		req.session.backURL = '/';
	}
	// Forward the request to the passport middleware.
	next();
}, passport.authenticate('discord'));

// Gets login details
router.get('/callback', passport.authenticate('discord', {
	failureRedirect: '/',
}), async (req, res) => {
	if (req.session.backURL) {
		res.redirect(req.session.backURL);
		req.session.backURL = null;
	} else {
		res.redirect('/servers');
	}
	const country = await getIP(req);
	console.log(`${res.req.user.username}#${res.req.user.discriminator} has logged on with IP: ${country.ipAddress} (${country.city}, ${country.countryName})`);
});

// For web scrapers
router.get('/robots.txt', function(req, res) {
	res.type('text/plain');
	res.send('User-agent: *\nallow: /\n\nUser-agent: *\ndisallow: /manage');
});

// Error 404 (Keep this last)
router.get('*', async function(req, res) {
	res.send('<p>404 File Not Found. Please wait...<p> <script>setTimeout(function () { window.location = "/"; }, 1000);</script><noscript><meta http-equiv="refresh" content="1; url=/" /></noscript>');
});

module.exports = router;
