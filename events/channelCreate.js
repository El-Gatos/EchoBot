const { Events, AuditLogEvent, EmbedBuilder } = require("discord.js");
const { sendLog } = require("../utils/logUtils");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = {
  name: Events.ChannelCreate,
  async execute(channel) {
    if (!channel.guild) return;
    try {
      await sleep(1000);

      const fetchedLogs = await channel.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.ChannelCreate,
      });
      const log = fetchedLogs.entries.first();

      if (!log || log.target.id !== channel.id) return;

      const embed = new EmbedBuilder()
        .setColor("Green")
        .setTitle("Channel Created")
        .addFields(
          { name: "Channel", value: channel.toString() },
          { name: "Created By", value: log.executor.toString() }
        )
        .setTimestamp();

      sendLog(channel.guild, embed, channel.client);
    } catch (error) {
      console.error("Error in channelCreate logger:", error);
    }
  },
};
