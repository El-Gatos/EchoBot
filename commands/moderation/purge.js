const {
  SlashCommandBuilder,
  PermissionsBitField,
  MessageFlags,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("purge")
    .setDescription("Deletes a specified number of messages from the channel.")
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("The number of messages to delete (1-99)")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(99)
    )
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageMessages),

  async execute(interaction) {
    // This permission check is redundant but good practice
    if (
      !interaction.member.permissions.has(
        PermissionsBitField.Flags.ManageMessages
      )
    ) {
      // This reply's ephemeral status is now set with a flag
      return interaction.editReply({
        content: "You do not have permission to use this command.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const amount = interaction.options.getInteger("amount");

    try {
      // Fetch and delete messages
      const fetched = await interaction.channel.messages.fetch({
        limit: amount,
      });
      await interaction.channel.bulkDelete(fetched);

      await interaction.editReply({
        content: `Successfully deleted ${fetched.size} messages.`,
      });
    } catch (error) {
      console.error(error);
      await interaction.editReply({
        content: "There was an error trying to purge messages in this channel!",
      });
    }
  },
};
