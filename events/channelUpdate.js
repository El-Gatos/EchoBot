const { Events, AuditLogEvent, EmbedBuilder } = require("discord.js");
const { sendLog } = require("../utils/logUtils");

module.exports = {
  name: Events.ChannelUpdate,
  async execute(oldChannel, newChannel) {
    if (!newChannel.guild) return;

    const fetchedLogs = await newChannel.guild.fetchAuditLogs({
      limit: 1,
      type: AuditLogEvent.ChannelUpdate,
    });
    const log = fetchedLogs.entries.first();

    if (!log || log.target.id !== newChannel.id) return;

    // For simplicity, we'll log general updates. A more complex version could detail what changed.
    const embed = new EmbedBuilder()
      .setColor("Blue")
      .setTitle("Channel Updated")
      .setDescription(`Channel ${newChannel} was updated by ${log.executor}.`)
      .setTimestamp();

    // Example of detailing a name change
    if (oldChannel.name !== newChannel.name) {
      embed.addFields({
        name: "Name Change",
        value: `\`${oldChannel.name}\` -> \`${newChannel.name}\``,
      });
    }

    sendLog(newChannel.guild, embed, newChannel.client);
  },
};
