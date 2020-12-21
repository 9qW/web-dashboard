const express = require('express'),
	router = express.Router(),
	fetch = require('node-fetch'),
	url = require('url'),
	config = require('../config.js'),
	passport = require('passport'),
	{ Strategy } = require('passport-discord'),
	{ Permissions } = require('discord.js'),
	logger = require('../modules/logging/logger'),
	fs = require('fs'),
	md = require('marked'),
	checkAuth = require('../auth/checkLogin');

// Get IP and location (for logging)
async function getIP(req) {
	const IP = req.connection.remoteAddress.slice(7);
	const country = await fetch(`http://api.db-ip.com/v2/free/${IP}`).then(info => info.json());
	if (IP != '86.25.177.233') {
		return country;
	}
}

// Get privacy and terms and condition text
let privacyMD = '';
fs.readFile('./src/public/PRIVACY.md', function(err, data) {
	if (err) {
		console.log(err);
		privacyMD = 'Error';
		return;
	}
	privacyMD = data.toString().replace().replace(/\{\{botName\}\}/g, 'Test Account').replace(/\{\{email\}\}/g, 'benjamin.forey11@gmail.com');
	// if (client.config.dashboard.secure !== 'true') {
	// privacyMD = privacyMD.replace('Sensitive and private data exchange between the Site and its Users happens over a SSL secured communication channel and is encrypted and protected with digital signatures.', '');
	// }
});
let termsMD = '';
fs.readFile('./src/public/TERMS.md', function(err, data) {
	if (err) {
		console.log(err);
		termsMD = 'Error';
		return;
	}
	termsMD = data.toString().replace(/\{\{botName\}\}/g, 'Test Account').replace(/\{\{email\}\}/g, 'benjamin.forey11@gmail.com');
});


// Works in background for user storage
passport.serializeUser((user, done) => {
	done(null, user);
});
passport.deserializeUser((obj, done) => {
	done(null, obj);
});

// Discord Ouath2 data
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
	logger.log(`Connection IP: ${country.ipAddress} ${(country.city == undefined) ? '' : `, Location:${country.city}, ${country.countryName}.`}`);
});

// login page
router.get('/login', (req, res, next) => {
	// We determine the returning url.
	if (req.session.backURL) {
		req.session.backURL = req.session.backURL; // eslint-disable-line no-self-assign
	} else if (req.headers.referer) {
		const parsed = url.parse(req.headers.referer);
		if (parsed.hostname === req.bot.config.domain) {
			req.session.backURL = parsed.path;
		}
	} else {
		req.session.backURL = '/';
	}
	// Forward the request to the passport middleware.
	next();
}, passport.authenticate('discord'));

// Logout the user
router.get('/logout', function(req, res) {
	req.logout();
	res.redirect('/');
});

// Show the servers that the user can manage
router.get('/servers', async function(req, res) {
	if (req.isAuthenticated()) {
		const guilds = await fetch('http://discord.com/api/users/@me/guilds', {
			method: 'GET',
			headers: {
				Authorization: `Bot ${req.bot.config.token}`,
			},
		}).then(data => data.json());
		res.render('navbar/server', {
			bot: req.bot,
			auth: true,
			user: req.user,
			Permissions: Permissions,
			guilds: guilds,
		});
	} else {
		res.redirect('/login');
	}
});

// premium page
router.get('/premium', async function(req, res) {
	res.render('navbar/premium', {
		bot: req.bot,
		auth: req.isAuthenticated() ? true : false,
		user: req.isAuthenticated() ? req.user : null,
		support: req.bot.config.SupportServer,
	});

});

// Add Bot to server
router.get('/add/:guildID', checkAuth, async (req, res) => {
	req.session.backURL = '/servers';
	const guilds = await fetch('http://discord.com/api/users/@me/guilds', {
		method: 'GET',
		headers: {
			Authorization: `Bot ${req.bot.config.token}`,
		},
	}).then(data => data.json());
	// Check if bot is the list or not
	guilds.forEach(guild => {
		if (guild.id == req.params.guildID) {
			res.send('<p>The bot is already there... <script>setTimeout(function () { window.location="/servers"; }, 1000);</script><noscript><meta http-equiv="refresh" content="1; url=/dashboard" /></noscript>');
		} else {
			res.redirect(`https://discordapp.com/api/oauth2/authorize?client_id=${req.bot.config.BotID}&permissions=8&scope=bot&guild_id=${req.params.guildID}`);
		}
	});
});

// Invite bot to server and makes them login and then directs them to manage page
router.get('/invite', (req, res) => {
	if (req.isAuthenticated()) {
		res.redirect('/servers');
	} else {
		res.redirect(`https://discordapp.com/api/oauth2/authorize?response_type=code&client_id=${req.bot.config.BotID}&permissions=8&scope=bot+identify+guilds&redirect_uri=${req.bot.config.domain}/callback`);
		// find the server that was added and go to that dashboard
	}
});


// Gets login details
router.get('/callback', passport.authenticate('discord', {
	failureRedirect: '/',
}), async (req, res) => {
	if (req.session.backURL) {
		res.redirect(req.session.backURL);
		req.session.backURL = null;
	} else if (req.query.guild_id) {
		res.redirect(`/manage/${req.query.guild_id}`);
	} else {
		res.redirect('/servers');
	}
	const country = await getIP(req);
	logger.log(`${res.req.user.username}#${res.req.user.discriminator} has logged on with IP: ${country.ipAddress} ${(country.city == undefined) ? '' : `, Location:${country.city}, ${country.countryName}.`}`);
});

// Show the commands that the bot do
router.get('/commands', (req, res) => {
	res.render('navbar/commands', {
		bot: req.bot,
		auth: req.isAuthenticated() ? true : false,
		user: req.isAuthenticated() ? req.user : null,
	});
});

// premium page
router.get('/premium', async function(req, res) {
	res.render('navbar/premium', {
		bot: req.bot,
		auth: req.isAuthenticated() ? true : false,
		user:req.isAuthenticated() ? req.user : null,
	});
});

// privacy page
router.get('/privacy', function(req, res) {
	md.setOptions({
		renderer: new md.Renderer(),
		gfm: true,
		tables: true,
		breaks: false,
		pedantic: false,
		sanitize: false,
		smartLists: true,
		smartypants: false,
	});
	res.render('extras/legal', {
		bot: req.bot,
		auth: req.isAuthenticated() ? true : false,
		user: req.isAuthenticated() ? req.user : null,
		privacy: md(privacyMD),
		terms: md(termsMD),
		edited: 'POG',
	});
});

// For web scrapers
router.get('/robots.txt', function(req, res) {
	res.type('text/plain');
	res.send('User-agent: *\nallow: /\n\nUser-agent: *\ndisallow: /manage');
});

module.exports = router;
