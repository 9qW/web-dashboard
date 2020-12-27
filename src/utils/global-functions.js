// Dependencies
const fetch = require('node-fetch');
let totalGuilds = {},
	prevUserGuild = {};

// Get all of the bots guilds
module.exports.getBotTotalGuilds = async (req) => {
	// get guilds from cache if they are the same number
	console.log(totalGuilds);
	let guilds;
	if (req.user.guilds.length == prevUserGuild[req.user.id].guild) {
		guilds = totalGuilds;
		console.log(`Retrieved ${guilds.length} guilds from cache`);
	} else {
		guilds = await fetch('http://discord.com/api/users/@me/guilds', {
			method: 'GET',
			headers: {
				Authorization: `Bot ${req.bot.config.token}`,
			},
		}).then(data => data.json());
		totalGuilds = guilds;
		console.log(`Retrieved ${guilds.length} guilds`);
	}
	return guilds;
};

// get guild
// get user/member
