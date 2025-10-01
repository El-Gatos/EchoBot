const { Events, EmbedBuilder } = require("discord.js");
const { clownboard } = require("../config.json");
//Stolen from bleed ;)
module.exports = {
  name: Events.MessageReactionAdd,
  async execute(reaction, user) {
    // --- Initial Checks ---
    if (!clownboard.enabled) return;
    if (reaction.emoji.name !== clownboard.reactionEmoji) return;
    if (reaction.count < clownboard.threshold) return;
    if (!reaction.message.guild) return; // Ignore DMs
    if (user.bot) return; // Ignore reactions from bots

    // Fetch the full message object if it's a partial
    if (reaction.message.partial) {
      try {
        await reaction.message.fetch();
      } catch (error) {
        console.error("Something went wrong when fetching the message:", error);
        return;
      }
    }

    const db = reaction.client.db;
    const originalMessage = reaction.message;

    // --- Database Check to Prevent Duplicates ---
    const clownboardRef = db
      .collection("guilds")
      .doc(originalMessage.guild.id)
      .collection("clownboardMessages")
      .doc(originalMessage.id);
    const doc = await clownboardRef.get();
    if (doc.exists) {
      // This message has already been posted to the clownboard.
      return;
    }

    // --- Post to Clownboard ---
    try {
      const clownboardChannel = await originalMessage.guild.channels.fetch(
        clownboard.channelId
      );
      if (!clownboardChannel) return;

      // Create the embed
      const embed = new EmbedBuilder()
        .setColor("#E67E22")
        .setAuthor({
          name: originalMessage.author.tag,
          iconURL: originalMessage.author.displayAvatarURL(),
        })
        .setDescription(originalMessage.content || "*No text content*")
        .addFields({
          name: "Source",
          value: `[Jump to Message](${originalMessage.url})`,
        })
        .setTimestamp(originalMessage.createdAt)
        .setFooter({ text: `${reaction.count} ${clownboard.reactionEmoji}` });

      // If there's an image attachment, add it to the embed
      if (originalMessage.attachments.size > 0) {
        const firstAttachment = originalMessage.attachments.first();
        if (firstAttachment.contentType?.startsWith("image/")) {
          embed.setImage(firstAttachment.url);
        }
      }

      const sentMessage = await clownboardChannel.send({ embeds: [embed] });

      // --- Save to Database ---
      await clownboardRef.set({
        clownboardMessageId: sentMessage.id,
        timestamp: new Date(),
      });
    } catch (error) {
      console.error("Error handling clownboard:", error);
    }
  },
};
