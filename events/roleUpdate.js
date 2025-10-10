const { Events, AuditLogEvent, EmbedBuilder } = require("discord.js");
const { sendLog } = require("../utils/logUtils");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = {
  name: Events.RoleUpdate,
  async execute(oldRole, newRole) {
    try {
      await sleep(1000); // Wait for audit log

      // Fetch a list of recent logs to avoid race conditions
      const fetchedLogs = await newRole.guild.fetchAuditLogs({
        limit: 5,
        type: AuditLogEvent.RoleUpdate,
      });

      // Find the specific log entry for this role that is recent
      const log = fetchedLogs.entries.find(
        (l) =>
          l.target.id === newRole.id && l.createdTimestamp > Date.now() - 5000
      );

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
          value: `#${oldRole.color.toString(16)} -> #${newRole.color.toString(
            16
          )}`,
        });
      }

      sendLog(newRole.guild, embed, newRole.client);
    } catch (error) {
      console.error("Error in roleUpdate logger:", error);
    }
  },
};
