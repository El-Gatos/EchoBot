const { Events, ActivityType } = require("discord.js");

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`Ready! Logged in as ${client.user.tag}`);

    // Set the bot's custom activity status
    client.user.setPresence({
      activities: [
        {
          type: ActivityType.Custom,
          name: "custom",
          state: "Chasing mice...",
        },
      ],
      status: "dnd",
    });
  },
};
