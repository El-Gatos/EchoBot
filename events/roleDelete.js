const { Events, AuditLogEvent } = require("discord.js");
const { recordAction } = require("../utils/antiNukeManager");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = {
  name: Events.RoleDelete,
  async execute(role) {
    if (!role.guild) return;

    const { client } = role;

    try {
      await sleep(1000);

      const auditLogs = await role.guild.fetchAuditLogs({
        limit: 5,
        type: AuditLogEvent.RoleDelete,
      });
      const deleteLog = auditLogs.entries.find(
        (log) => log.target.id === role.id
      );

      if (!deleteLog) {
        return;
      }

      const { executor } = deleteLog;

      if (Date.now() - deleteLog.createdTimestamp < 5000) {
        recordAction(role.guild, executor, "roleDeletes", client);
      }
    } catch (error) {
      console.error(
        "[Anti-Nuke] Could not fetch audit logs for role delete:",
        error
      );
    }
  },
};
