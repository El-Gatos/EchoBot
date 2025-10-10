const { Events, AuditLogEvent, EmbedBuilder } = require("discord.js");
const { sendLog } = require("../utils/logUtils");

// Helper function to introduce a delay
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = {
  name: Events.RoleCreate, // Corrected from ChannelUpdate
  async execute(role) {
    try {
      await sleep(1000); // Wait for audit log

      const fetchedLogs = await role.guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.RoleCreate,
      });
      const log = fetchedLogs.entries.first();

      // Ensure a log entry was found and that it corresponds to the created role
      if (!log || log.target.id !== role.id) return;

      const embed = new EmbedBuilder()
        .setColor("Green")
        .setTitle("Role Created")
        .addFields(
          { name: "Role Name", value: role.name },
          { name: "Created By", value: log.executor.toString() }
        )
        .setTimestamp();

      sendLog(role.guild, embed, role.client);
    } catch (error) {
      console.error("Error in roleCreate logger:", error);
    }
  },
};
