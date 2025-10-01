const {
  SlashCommandBuilder,
  PermissionsBitField,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("softban")
    .setDescription("Kicks a user and deletes their recent messages.")
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("The user to softban")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("days")
        .setDescription("Days of messages to delete (0-7)")
        .setMinValue(0)
        .setMaxValue(7)
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("The reason for the softban")
    )
    .setDefaultMemberPermissions(PermissionsBitField.Flags.BanMembers),

  async execute(interaction) {
    const targetUser = interaction.options.getUser("target");
    const daysToDelete = interaction.options.getInteger("days") || 1; // Default to 1 day
    const reason =
      interaction.options.getString("reason") || "No reason provided";

    const targetMember = await interaction.guild.members.fetch(targetUser.id);

    // --- Validation ---
    if (!targetMember) {
      return interaction.editReply("That user doesn't exist in this server.");
    }
    if (!targetMember.bannable) {
      return interaction.editReply(
        "I cannot softban this user. They may have a higher role than me or I lack permissions."
      );
    }
    if (targetUser.id === interaction.user.id) {
      return interaction.editReply("You cannot softban yourself.");
    }

    // --- Action ---
    try {
      const deleteMessageSeconds = daysToDelete * 24 * 60 * 60; // Convert days to seconds

      // 1. Ban the user to delete their messages
      await interaction.guild.bans.create(targetUser, {
        deleteMessageSeconds: deleteMessageSeconds,
        reason: `Softban by ${interaction.user.tag}: ${reason}`,
      });

      // 2. Immediately unban the user
      await interaction.guild.bans.remove(targetUser, {
        reason: `Softban completion for ${interaction.user.tag}.`,
      });

      const embed = new EmbedBuilder()
        .setColor("Orange")
        .setTitle("User Softbanned")
        .setDescription(`Successfully softbanned **${targetUser.tag}**.`)
        .addFields(
          { name: "Reason", value: reason },
          { name: "Messages Deleted", value: `${daysToDelete} day(s)` },
          { name: "Moderator", value: interaction.user.tag }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.editReply(
        "An error occurred. The user may have been banned but not unbanned. Please check the ban list manually."
      );
    }
  },
};
