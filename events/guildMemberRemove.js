const { Events, EmbedBuilder, AuditLogEvent } = require("discord.js");

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(member) {
    const db = member.client.db;
    const configRef = db
      .collection("guilds")
      .doc(member.guild.id)
      .collection("config")
      .doc("logging");
    const doc = await configRef.get();
    if (!doc.exists || !doc.data().enabled || !doc.data().channelId) return;

    const logChannel = await member.guild.channels
      .fetch(doc.data().channelId)
      .catch(() => null);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setColor("Orange")
      .setAuthor({
        name: member.user.tag,
        iconURL: member.user.displayAvatarURL(),
      })
      .setTitle("Member Left")
      .addFields(
        { name: "User", value: `${member.user.tag} (${member.id})` },
        {
          name: "Joined",
          value: `<t:${parseInt(member.joinedTimestamp / 1000)}:R>`,
        }
      )
      .setTimestamp();

    // Check audit logs for kick/ban
    const fetchedLogs = await member.guild
      .fetchAuditLogs({
        limit: 1,
        type: AuditLogEvent.MemberKick,
      })
      .catch(() => null);

    const kickLog = fetchedLogs?.entries.first();
    if (
      kickLog &&
      kickLog.target.id === member.id &&
      kickLog.createdAt > member.joinedAt
    ) {
      embed.setColor("Red").setTitle("Member Kicked");
      embed.addFields({
        name: "Reason",
        value: kickLog.reason || "No reason provided",
      });
      embed.addFields({ name: "Moderator", value: kickLog.executor.tag });
    }
    // You can add a similar check for AuditLogEvent.MemberBanAdd

    logChannel.send({ embeds: [embed] });
  },
};
