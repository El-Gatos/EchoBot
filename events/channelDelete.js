const { Events, AuditLogEvent } = require("discord.js");
const { recordAction } = require("../utils/antiNukeManager");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = {
  name: Events.ChannelDelete,
  async execute(channel) {
    if (!channel.guild) return;

    const { client } = channel;

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
        return;
      }

      const { executor } = deleteLog;

      if (Date.now() - deleteLog.createdTimestamp < 5000) {
        recordAction(channel.guild, executor, "channelDeletes", client);
      }
    } catch (error) {
      console.error(
        "[Anti-Nuke] Could not fetch audit logs for channel delete:",
        error
      );
    }
  },
};
