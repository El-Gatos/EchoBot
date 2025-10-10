const { Events, AuditLogEvent, EmbedBuilder } = require("discord.js");
const { sendLog } = require("../utils/logUtils");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = {
  name: Events.ChannelUpdate,
  async execute(oldChannel, newChannel) {
    if (!newChannel.guild) return;
    try {
      await sleep(1000);

      const fetchedLogs = await newChannel.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.ChannelUpdate,
      });
      const log = fetchedLogs.entries.first();

      if (!log || log.target.id !== newChannel.id) return;

      const embed = new EmbedBuilder()
        .setColor("Blue")
        .setTitle("Channel Updated")
        .setDescription(`Channel ${newChannel} was updated by ${log.executor}.`)
        .setTimestamp();

      if (oldChannel.name !== newChannel.name) {
        embed.addFields({
          name: "Name Change",
          value: `\`${oldChannel.name}\` -> \`${newChannel.name}\``,
        });
      }

      sendLog(newChannel.guild, embed, newChannel.client);
    } catch (error) {
      console.error("Error in channelUpdate logger:", error);
    }
  },
};
