const {
  SlashCommandBuilder,
  PermissionsBitField,
  InteractionContextType,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Deletes a specified number of messages from the channel.")
    .setContexts(InteractionContextType.Guild)
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("The number of messages to delete (1-99)")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(99)
    )
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages),
  isPublic: true,
  async execute(interaction) {
    // Permission check
    if (
      !interaction.member.permissions.has(
        PermissionsBitField.Flags.ManageMessages
      )
    ) {
      return interaction.editReply({
        content: "You do not have permission to use this command.",
      });
    }

    const amount = interaction.options.getInteger("amount");

    try {
      const fetched = await interaction.channel.messages.fetch({
        limit: amount,
      });

      const deletedMessages = await interaction.channel.bulkDelete(
        fetched,
        true
      );

      await interaction.editReply({
        content: `Successfully deleted ${deletedMessages.size} messages.`,
      });
    } catch (error) {
      console.error(error);
      await interaction.editReply({
        content:
          "An error occurred. I may not have permissions to delete messages in this channel.",
      });
    }
  },
};
