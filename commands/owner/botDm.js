const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");
const { ownerId } = require("../../config.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("dm")
    .setDescription("[Owner Only] Sends a direct message to a user as the bot.")
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("The user to send a DM to")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("message")
        .setDescription("The message to send")
        .setRequired(true)
    ),

  async execute(interaction) {
    // --- Owner Check ---
    if (interaction.user.id !== ownerId) {
      return interaction.editReply({
        content: "This command is reserved for the bot owner.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const targetUser = interaction.options.getUser("target");
    const messageContent = interaction.options.getString("message");

    // --- Validation ---
    if (targetUser.bot) {
      return interaction.editReply({
        content: "You cannot send DMs to other bots.",
      });
    }

    // --- Action ---
    try {
      await targetUser.send(messageContent);

      // --- Success Feedback ---
      const successEmbed = new EmbedBuilder()
        .setColor("Green")
        .setTitle("DM Sent Successfully")
        .addFields(
          { name: "Recipient", value: targetUser.tag },
          { name: "Message", value: `\`\`\`${messageContent}\`\`\`` }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [successEmbed] });
    } catch (error) {
      console.error(`Could not send DM to ${targetUser.tag}.`, error);

      // --- Error Feedback ---
      const errorEmbed = new EmbedBuilder()
        .setColor("Red")
        .setTitle("Failed to Send DM")
        .setDescription(
          `Could not send the message to **${targetUser.tag}**. They may have DMs disabled or have blocked the bot.`
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};
