// Dependecies
const fetch = require('node-fetch'),
	express = require('express'),
	app = express(),
	http = require('http'),
	https = require('https'),
	fs = require('fs'),
	config = require('./config.js'),
	rateLimit = require('express-rate-limit'),
	passport = require('passport'),
	session = require('express-session'),
	bodyParser = require('body-parser'),
	routes = require('./routes');

// Creates the webserver
(async function init() {

	// This gets the bot info (self-host)
	async function botInfo() {
		const response = await fetch('http://discord.com/api/users/@me', {
			method: 'GET',
			headers: {
				Authorization: `Bot ${config.token}`,
			},
		}).then(data => data.json());
		return response;
	}
	const bot = await botInfo();

	// Each page can be accessed 100 times within a minute
	const limiter = new rateLimit({
		// 1 minute
		windowMs: 1 * 60 * 1000,
		max: 100,
	});

	// Session data, used for temporary storage of your visitor's session information.
	// the `secret` is in fact a 'salt' for the data, and should not be shared publicly.
	app
		.use(session({
			secret: config.sessionSecret,
			resave: false,
			saveUninitialized: false,
			secure: true,
		}))
		// Limits how many times a user can access my website (basic raid protection)
		.use(limiter)
		// Initializes passport and session.
		.use(passport.initialize())
		.use(passport.session())
		.use(async function(req, res, next) {
			req.bot = bot;
			next();
		})
		// Uses EJS template
		.engine('html', require('ejs').renderFile)
		.set('view engine', 'ejs')
		.set('views', './src/views')
		.use(bodyParser.urlencoded({
			extended: true,
		}))
		// get external files like css, js, images etc
		.use(express.static('./src/public'))
		.use('/', routes);

	if (config.protocol == 'https') {
		// create HTTP server
		http.createServer(function(req, res) {
			res.writeHead(301, { 'Location': config.domain });
			res.end();
		}).listen(80, () => {
			console.log('Bot dashboard is online, running on port: 80', 'ready');
		}).on('error', (err) => {
			console.log(`Error with starting dashboard: ${err.code}`, 'error');
		});

		// create HTTPS server
		https.createServer({
			key: fs.readFileSync('./src/selfsigned.key', 'utf-8'),
			cert: fs.readFileSync('./src/selfsigned.crt', 'utf-8'),
		}, app).listen(443, () => {
			console.log('Bot dashboard is online, running on port: 443', 'ready');
		}).on('error', (err) => {
			console.log(`Error with starting dashboard: ${err.code}`, 'error');
		});
	} else {
		// If protocol is not https
		app.listen(80, () => {
			console.log('Bot dashboard is online', 'ready');
		}).on('error', (err) => {
			console.log(`Error with starting dashboard: ${err.code}`, 'error');
		});
	}
})();
