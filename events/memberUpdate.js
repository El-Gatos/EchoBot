const { Events, AuditLogEvent, EmbedBuilder } = require("discord.js");
const { sendLog } = require("../utils/logUtils");

module.exports = {
  name: Events.GuildMemberUpdate,
  async execute(oldMember, newMember) {
    const { guild, client } = newMember;

    // --- Role Change Detection ---
    if (oldMember.roles.cache.size !== newMember.roles.cache.size) {
      const fetchedLogs = await guild.fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.MemberRoleUpdate,
      });
      const log = fetchedLogs.entries.first();

      if (!log || log.target.id !== newMember.id) return;

      const oldRoles = oldMember.roles.cache;
      const newRoles = newMember.roles.cache;

      const addedRole = newRoles.find((role) => !oldRoles.has(role.id));
      const removedRole = oldRoles.find((role) => !newRoles.has(role.id));

      const embed = new EmbedBuilder()
        .setTitle("Member Roles Updated")
        .addFields(
          { name: "Member", value: newMember.toString(), inline: true },
          { name: "Updated By", value: log.executor.toString(), inline: true }
        )
        .setTimestamp();

      if (addedRole) {
        embed.setColor("Green").setDescription(`**Added Role:** ${addedRole}`);
      } else if (removedRole) {
        embed
          .setColor("Red")
          .setDescription(`**Removed Role:** ${removedRole}`);
      }

      return sendLog(guild, embed, client);
    }

    // --- Nickname Change Detection ---
    if (oldMember.nickname !== newMember.nickname) {
      const embed = new EmbedBuilder()
        .setColor("Blue")
        .setTitle("Nickname Changed")
        .addFields(
          { name: "Member", value: newMember.toString() },
          {
            name: "Old Nickname",
            value: `\`${oldMember.nickname || oldMember.user.username}\``,
            inline: true,
          },
          {
            name: "New Nickname",
            value: `\`${newMember.nickname || newMember.user.username}\``,
            inline: true,
          }
        )
        .setTimestamp();

      return sendLog(guild, embed, client);
    }
  },
};
