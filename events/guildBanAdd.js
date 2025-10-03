const { Events, AuditLogEvent } = require("discord.js");
const { recordAction } = require("../utils/antiNukeManager");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = {
  name: Events.RoleDelete,
  async execute(role, client) {
    if (!role.guild) return;
    console.log(
      `[Anti-Nuke] Detected role delete for "${role.name}" in "${role.guild.name}".`
    );

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
        console.log(
          `[Anti-Nuke] No specific audit log found for role ${role.name}.`
        );
        return;
      }

      const { executor } = deleteLog;
      console.log(
        `[Anti-Nuke] Found log: Executor ${executor.tag}, Target ${role.id}`
      );

      if (Date.now() - deleteLog.createdTimestamp < 5000) {
        console.log(
          `[Anti-Nuke] Log confirmed. Recording action for ${executor.tag}.`
        );
        recordAction(role.guild, executor, "roleDeletes", client);
      } else {
        console.log("[Anti-Nuke] Log was too old.");
      }
    } catch (error) {
      console.error(
        "[Anti-Nuke] Could not fetch audit logs for role delete:",
        error
      );
    }
  },
};
