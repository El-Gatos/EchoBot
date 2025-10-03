const { Events, EmbedBuilder } = require("discord.js");
const { getXpForLevel } = require("../utils/levelingUtil.js");

/**
 * Checks a message against the server's custom automod rules.
 * @param {import('discord.js').Message} message The message to check.
 * @returns {Promise<boolean>} Whether the message was deleted by a rule.
 */
async function handleAutoMod(message) {
  // Ignore staff members
  if (message.member?.permissions.has("ManageMessages")) {
    return false;
  }

  const db = message.client.db;
  const configRef = db
    .collection("guilds")
    .doc(message.guild.id)
    .collection("config")
    .doc("automod");
  const doc = await configRef.get();

  if (!doc.exists) {
    return false;
  }

  const config = doc.data();
  const content = message.content;

  // --- Word Filter ---
  if (config.wordFilterEnabled && config.bannedWords?.length) {
    const lowerCaseContent = content.toLowerCase();
    const hasBannedWord = config.bannedWords.some((word) =>
      lowerCaseContent.includes(word)
    );
    if (hasBannedWord) {
      try {
        await message.delete();
        const reply = await message.channel.send(
          `${message.author}, your message contained a filtered word and has been deleted.`
        );
        setTimeout(() => reply.delete(), 5000);
      } catch (error) {
        console.error("AutoMod Error (Word Filter):", error);
      }
      return true;
    }
  }

  // --- Invite Filter ---
  if (config.inviteFilterEnabled) {
    const inviteRegex =
      /(discord\.(gg|io|me|li)\/[^\s]+)|(discordapp\.com\/invite\/[^\s]+)/i;
    if (inviteRegex.test(content)) {
      try {
        await message.delete();
        const reply = await message.channel.send(
          `${message.author}, posting invite links is not allowed here.`
        );
        setTimeout(() => reply.delete(), 5000);
      } catch (error) {
        console.error("AutoMod Error (Invite Filter):", error);
      }
      return true;
    }
  }

  // --- Mass Mention Filter ---
  if (config.mentionFilterEnabled) {
    const mentionLimit = config.mentionLimit || 5;
    const totalMentions =
      message.mentions.users.size + message.mentions.roles.size;
    if (totalMentions > mentionLimit) {
      try {
        await message.delete();
        const reply = await message.channel.send(
          `${message.author}, your message contained too many mentions and has been deleted.`
        );
        setTimeout(() => reply.delete(), 5000);
      } catch (error) {
        console.error("AutoMod Error (Mention Filter):", error);
      }
      return true;
    }
  }

  return false;
}

async function handleLeveling(message) {
  // ... (This function is unchanged)
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
  const xpGained = Math.floor(Math.random() * 10) + 15;
  if (!userDoc.exists) {
    await userRef.set({ xp: xpGained, level: 0, lastMessage: now });
    return;
  }
  const userData = userDoc.data();
  const cooldown = 60 * 1000;
  if (now - userData.lastMessage < cooldown) return;
  const newXp = userData.xp + xpGained;
  let newLevel = userData.level;
  const xpNeededForNextLevel = getXpForLevel(newLevel + 1);
  if (newXp >= xpNeededForNextLevel) {
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
  await userRef.update({ xp: newXp, level: newLevel, lastMessage: now });
}

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    // ... (This part is unchanged)
    if (message.author.bot || !message.guild) return;
    const messageDeleted = await handleAutoMod(message);
    if (messageDeleted) return;
    const db = message.client.db;
    const guildId = message.guild.id;
    const authorId = message.author.id;
    const afkRef = db
      .collection("guilds")
      .doc(guildId)
      .collection("afkUsers")
      .doc(authorId);
    const afkDoc = await afkRef.get();
    if (afkDoc.exists) {
      await afkRef.delete();
      try {
        if (
          message.member.manageable &&
          message.member.displayName.startsWith("[AFK]")
        ) {
          const oldNickname = message.member.displayName.replace("[AFK] ", "");
          await message.member.setNickname(oldNickname);
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
    await handleLeveling(message);
  },
};
