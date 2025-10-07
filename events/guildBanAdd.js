const { Events, AuditLogEvent } = require("discord.js");
const { recordAction } = require("../utils/antiNukeManager");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = {
  name: Events.GuildBanAdd,
  async execute(ban) {
    const { client } = ban;
    try {
      await sleep(1000);

      const auditLogs = await ban.guild.fetchAuditLogs({
        limit: 5,
        type: AuditLogEvent.MemberBanAdd,
      });
      const banLog = auditLogs.entries.find(
        (log) => log.target.id === ban.user.id
      );

      if (!banLog) {
        return;
      }

      const { executor } = banLog;

      if (Date.now() - banLog.createdTimestamp < 5000) {
        recordAction(ban.guild, executor, "memberBans", client);
      }
    } catch (error) {
      console.error(
        "[Anti-Nuke] Could not fetch audit logs for member ban:",
        error
      );
    }
  },
};
