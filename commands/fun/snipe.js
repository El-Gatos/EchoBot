const {
  SlashCommandBuilder,
  EmbedBuilder,
  ChannelType,
  InteractionContextType,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("snipe")
    .setDescription("Reveals the most recently deleted message in a channel.")
    .setContexts(InteractionContextType.Guild)
    .addIntegerOption((option) =>
      option
        .setName("position")
        .setDescription("Which message to snipe (1 = most recent)")
        .setMinValue(1)
        .setMaxValue(10)
    ),
  isPublic: true,
  async execute(interaction) {
    // Override the default ephemeral defer. This reply WILL be public.
    await interaction.deferReply();

    const position = interaction.options.getInteger("position") || 1;
    const snipedMessages = interaction.client.snipes.get(
      interaction.channel.id
    );

    if (!snipedMessages || snipedMessages.length < position) {
      return interaction.editReply({
        content: "There's nothing to snipe!",
        ephemeral: true,
      });
    }

    const sniped = snipedMessages[position - 1];

    const embed = new EmbedBuilder()
      .setColor("Aqua")
      .setAuthor({
        name: sniped.author.tag,
        iconURL: sniped.author.displayAvatarURL(),
      })
      .setDescription(sniped.content || "*No text content*")
      .setTimestamp(sniped.timestamp);

    if (sniped.attachment) {
      embed.setImage(sniped.attachment);
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
