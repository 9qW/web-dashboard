// Dependecies
const express = require('express'),
	router = express.Router(),
	// config = require('../config.js'),
	fetch = require('node-fetch'),
	{ Permissions } = require('discord.js'),
	database = require('../modules/database').init(),
	{ Guild } = require('../modules/database/models'),
	checkAuth = require('../auth/checkLogin');

// get guild settings
async function getGuild(guild) {
	const data = await Guild.findOne({ guildID: guild });
	return data;
}

// update settings
async function updateGuild(guild, settings) {
	let data = await getGuild(guild);
	if (typeof data !== 'object') data = {};
	for (const key in settings) {
		if (settings.key) {
			if (data[key] !== settings[key]) data[key] = settings[key];
			else return;
		}
	}
	// logger.log(`Guild: [${data.guildID}] updated settings: ${Object.keys(settings)}`);
	return await data.updateOne(settings);
}

async function getGuilds(req) {
	const guilds = await fetch(`http://discord.com/api/guilds/${req.params.guildID}`, {
		method: 'GET',
		headers: {
			Authorization: `Bot ${req.bot.config.token}`,
		},
	}).then(data => data.json());
	return guilds;
}

// Manage page for selected server
router.get('/:guildID', checkAuth, async (req, res) => {
	let isManaged = false;
	// add check for bot guilds
	req.user.guilds.forEach(guild => {
		if (guild.id == req.params.guildID) {
			const perms = new Permissions(guild.permissions);
			if (perms.has('MANAGE_GUILD')) {
				// User can edit server settings
				isManaged = true;
			}
		}
	});
	// Allow access or not
	if (isManaged) {
		res.render('plugins/dashboard', {
			bot: req.bot,
			user: req.user,
			auth: true,
			settings: await getGuild(req.params.guildID),
		});
	} else {
		res.redirect('/');
	}
});

// Update database with new settings
router.post('/manage/:guildID/welcome', checkAuth, async (req, res) => {
	// make sure bot is in guild
	const guild = await getGuilds(req);
	if (!guild) {
		res.redirect('/');
	} else {
		// get server settings
		// update database
		res.redirect(`/manage/${guild.id}/welcome`);
	}
});

module.exports = router;
