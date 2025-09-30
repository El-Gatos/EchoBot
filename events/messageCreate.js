const { Events, EmbedBuilder } = require("discord.js");
const { Timestamp } = require("firebase-admin/firestore");

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot || !message.guild) return;

    const db = message.client.db;
    const guildId = message.guild.id;
    const authorId = message.author.id;

    const afkRef = db
      .collection("guilds")
      .doc(guildId)
      .collection("afkUsers")
      .doc(authorId);
    const afkDoc = await afkRef.get();

    // --- Handle Returning from AFK ---
    if (afkDoc.exists) {
      await afkRef.delete();

      // --- Try to remove [AFK] from nickname ---
      try {
        const member = message.member;
        if (member.manageable && member.displayName.startsWith("[AFK]")) {
          const oldNickname = member.displayName.replace("[AFK] ", "");
          await member.setNickname(oldNickname);
        }
      } catch (error) {
        console.log(`Could not remove AFK nickname for ${message.author.tag}.`);
      }

      const welcomeBackEmbed = new EmbedBuilder()
        .setColor("Green")
        .setDescription(
          `Welcome back, ${message.author}! I have removed your AFK status.`
        );

      const reply = await message.reply({ embeds: [welcomeBackEmbed] });

      // Delete the "welcome back" message after a few seconds
      setTimeout(() => reply.delete(), 5000);
      return; // Stop processing to avoid checking for mentions in the return message
    }

    // --- Handle Mentions of AFK Users ---
    const mentionedUsers = message.mentions.users;
    if (mentionedUsers.size > 0) {
      const firstMentioned = mentionedUsers.first();
      const mentionedAfkRef = db
        .collection("guilds")
        .doc(guildId)
        .collection("afkUsers")
        .doc(firstMentioned.id);
      const mentionedAfkDoc = await mentionedAfkRef.get();

      if (mentionedAfkDoc.exists) {
        const afkData = mentionedAfkDoc.data();
        const afkTimestamp = afkData.timestamp.toMillis();

        const afkEmbed = new EmbedBuilder()
          .setColor("Orange")
          .setAuthor({
            name: `${firstMentioned.tag} is currently AFK`,
            iconURL: firstMentioned.displayAvatarURL(),
          })
          .setDescription(
            `**Status:** ${afkData.status}\n**Went AFK:** <t:${Math.round(
              afkTimestamp / 1000
            )}:R>`
          );

        message.reply({ embeds: [afkEmbed] });
      }
    }
  },
};
