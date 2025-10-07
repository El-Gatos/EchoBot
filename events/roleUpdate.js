const { Events, AuditLogEvent, EmbedBuilder } = require("discord.js");
const { sendLog } = require("../utils/logUtils");

module.exports = {
  name: Events.RoleUpdate,
  async execute(oldRole, newRole) {
    const fetchedLogs = await newRole.guild.fetchAuditLogs({
      limit: 1,
      type: AuditLogEvent.RoleUpdate,
    });
    const log = fetchedLogs.entries.first();

    if (!log) return;

    const embed = new EmbedBuilder()
      .setColor("Blue")
      .setTitle("Role Updated")
      .setDescription(`Role ${newRole} was updated by ${log.executor}.`)
      .setTimestamp();

    if (oldRole.name !== newRole.name) {
      embed.addFields({
        name: "Name Change",
        value: `\`${oldRole.name}\` -> \`${newRole.name}\``,
      });
    }
    if (oldRole.color !== newRole.color) {
      embed.addFields({
        name: "Color Change",
        value: `\`#${oldRole.color.toString(
          16
        )}\` -> \`#${newRole.color.toString(16)}\``,
      });
    }

    sendLog(newRole.guild, embed, newRole.client);
  },
};
