const { EmbedBuilder } = require("discord.js");

/**
 * Sends a log message to the configured logging channel for a guild.
 * @param {import('discord.js').Guild} guild The guild where the event occurred.
 * @param {EmbedBuilder} embed The embed to send.
 * @param {import('discord.js').Client} client The Discord client instance.
 */
async function sendLog(guild, embed, client) {
  try {
    const db = client.db;
    const configRef = db
      .collection("guilds")
      .doc(guild.id)
      .collection("config")
      .doc("logging");
    const doc = await configRef.get();

    if (!doc.exists || !doc.data().enabled || !doc.data().channelId) {
      return; // Logging is disabled or not configured
    }

    const logChannel = await guild.channels
      .fetch(doc.data().channelId)
      .catch(() => null);
    if (!logChannel) {
      // Channel might have been deleted, so we can't log.
      return;
    }

    await logChannel.send({ embeds: [embed] });
  } catch (error) {
    console.error(`Failed to send log for guild ${guild.id}:`, error);
  }
}

module.exports = { sendLog };
