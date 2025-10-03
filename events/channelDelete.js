const { Events, AuditLogEvent } = require("discord.js");
const { recordAction } = require("../utils/antiNukeManager");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = {
  name: Events.ChannelDelete,
  async execute(channel, client) {
    if (!channel.guild) return;
    console.log(
      `[Anti-Nuke] Detected channel delete for "${channel.name}" in "${channel.guild.name}".`
    );

    try {
      await sleep(1000);

      const auditLogs = await channel.guild.fetchAuditLogs({
        limit: 5,
        type: AuditLogEvent.ChannelDelete,
      });

      const deleteLog = auditLogs.entries.find(
        (log) => log.target.id === channel.id
      );

      if (!deleteLog) {
        console.log(
          `[Anti-Nuke] No specific audit log found for channel ${channel.name}.`
        );
        return;
      }

      const { executor } = deleteLog;
      console.log(
        `[Anti-Nuke] Found log: Executor ${executor.tag}, Target ${channel.id}`
      );

      if (Date.now() - deleteLog.createdTimestamp < 5000) {
        console.log(
          `[Anti-Nuke] Log confirmed. Recording action for ${executor.tag}.`
        );
        // --- CORRECTED FUNCTION CALL ---
        // We now pass the guild object and executor directly.
        recordAction(channel.guild, executor, "channelDeletes", client);
      } else {
        console.log("[Anti-Nuke] Log was too old.");
      }
    } catch (error) {
      console.error(
        "[Anti-Nuke] Could not fetch audit logs for channel delete:",
        error
      );
    }
  },
};
