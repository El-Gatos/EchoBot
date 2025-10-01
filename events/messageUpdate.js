const { Events, EmbedBuilder } = require("discord.js");

module.exports = {
  name: Events.MessageUpdate,
  async execute(oldMessage, newMessage) {
    if (newMessage.author.bot || !newMessage.guild) return;
    if (oldMessage.content === newMessage.content) return; // Ignore embed loads

    const db = newMessage.client.db;
    const configRef = db
      .collection("guilds")
      .doc(newMessage.guild.id)
      .collection("config")
      .doc("logging");
    const doc = await configRef.get();
    if (!doc.exists || !doc.data().enabled || !doc.data().channelId) return;

    const logChannel = await newMessage.guild.channels
      .fetch(doc.data().channelId)
      .catch(() => null);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setColor("Blue")
      .setAuthor({
        name: newMessage.author.tag,
        iconURL: newMessage.author.displayAvatarURL(),
      })
      .setTitle(`Message Edited in #${newMessage.channel.name}`)
      .setURL(newMessage.url)
      .addFields(
        { name: "Before", value: `\`\`\`${oldMessage.content || "N/A"}\`\`\`` },
        { name: "After", value: `\`\`\`${newMessage.content || "N/A"}\`\`\`` }
      )
      .setTimestamp();

    logChannel.send({ embeds: [embed] });
  },
};
