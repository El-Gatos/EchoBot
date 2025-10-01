// /events/messageCreate.js

const { Events, EmbedBuilder } = require("discord.js");

// --- NEW CODE - LEVELING SYSTEM ---
// This entire function definition goes at the top of the file.
async function handleLeveling(message) {
  const db = message.client.db;
  const guildId = message.guild.id;
  const userId = message.author.id;

  const configRef = db
    .collection("guilds")
    .doc(guildId)
    .collection("config")
    .doc("leveling");
  const configDoc = await configRef.get();
  if (!configDoc.exists || !configDoc.data().enabled) return;

  const userRef = db
    .collection("guilds")
    .doc(guildId)
    .collection("levels")
    .doc(userId);
  const userDoc = await userRef.get();
  const now = Date.now();

  // --- CORRECTED LOGIC ---
  if (!userDoc.exists) {
    // This is the user's first message
    const initialXp = Math.floor(Math.random() * 10) + 15; // 15-24 XP
    await userRef.set({ xp: initialXp, level: 0, lastMessage: now });
    return; // We're done, exit the function
  } else {
    // This is an existing user
    const userData = userDoc.data();
    const cooldown = 3 * 1000; // 1 minute cooldown

    if (now - userData.lastMessage < cooldown) return; // Still in cooldown

    const newXp = userData.xp + Math.floor(Math.random() * 10) + 15;
    const xpToNextLevel = 5 * userData.level ** 2 + 50 * userData.level + 100;
    let newLevel = userData.level;

    if (newXp >= xpToNextLevel) {
      newLevel++;
      const channelId = configDoc.data().channelId;
      if (channelId) {
        const channel = await message.guild.channels
          .fetch(channelId)
          .catch(() => null);
        if (channel) {
          const levelUpEmbed = new EmbedBuilder()
            .setColor("Gold")
            .setDescription(
              `🎉 Congratulations, ${message.author}! You have reached **Level ${newLevel}**!`
            );
          channel.send({ embeds: [levelUpEmbed] });
        }
      }
    }

    await userRef.update({
      xp: newXp,
      level: newLevel,
      lastMessage: now,
    });
  }
}

// --- MAIN EVENT EXPORT ---
module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot || !message.guild) return;

    const db = message.client.db;
    const guildId = message.guild.id;
    const authorId = message.author.id;

    // --- EXISTING CODE - AFK SYSTEM ---
    const afkRef = db
      .collection("guilds")
      .doc(guildId)
      .collection("afkUsers")
      .doc(authorId);
    const afkDoc = await afkRef.get();

    // Handle Returning from AFK
    if (afkDoc.exists) {
      await afkRef.delete();

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

      setTimeout(() => reply.delete(), 5000);
      return;
    }

    // --- NEW CODE - LEVELING SYSTEM ---
    // The call to the function goes here, after the AFK return check.
    await handleLeveling(message);

    // --- EXISTING CODE - AFK SYSTEM ---
    // Handle Mentions of AFK Users
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
