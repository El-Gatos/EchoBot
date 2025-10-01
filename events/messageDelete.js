const { Events, EmbedBuilder } = require("discord.js");

module.exports = {
  name: Events.MessageDelete,
  async execute(message) {
    if (message.author?.bot || !message.guild) return;

    // --- Snipe Handler ---
    // Save the deleted message to the client.snipes map
    const snipes = message.client.snipes;
    let channelSnipes = snipes.get(message.channel.id) || [];
    channelSnipes.unshift({
      // Add to the beginning of the array
      content: message.content,
      author: message.author,
      timestamp: Date.now(),
      attachment: message.attachments.first()?.proxyURL,
    });
    // Only keep the last 10 snipes for this channel
    if (channelSnipes.length > 10) channelSnipes.pop();
    snipes.set(message.channel.id, channelSnipes);

    // --- Logging Handler ---
    const db = message.client.db;
    const configRef = db
      .collection("guilds")
      .doc(message.guild.id)
      .collection("config")
      .doc("logging");
    const doc = await configRef.get();
    if (!doc.exists || !doc.data().enabled || !doc.data().channelId) return;

    const logChannel = await message.guild.channels
      .fetch(doc.data().channelId)
      .catch(() => null);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setColor("Red")
      .setAuthor({
        name: message.author.tag,
        iconURL: message.author.displayAvatarURL(),
      })
      .setTitle(`Message Deleted in #${message.channel.name}`)
      .setDescription(message.content || "*Message content not available.*")
      .setTimestamp();

    logChannel.send({ embeds: [embed] });
  },
};
