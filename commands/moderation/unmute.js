const {
  SlashCommandBuilder,
  PermissionsBitField,
  EmbedBuilder,
  InteractionContextType,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unmute")
    .setDescription("Unmutes a member.")
    .setContexts(InteractionContextType.Guild)
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("The user to unmute")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),

  async execute(interaction) {
    const targetUser = interaction.options.getUser("target");
    const reason = `Unmuted by ${interaction.user.tag}`;

    const targetMember = await interaction.guild.members.fetch(targetUser.id);

    // --- Validation ---
    if (!targetMember) {
      return interaction.editReply("That user doesn't exist in this server.");
    }
    if (!targetMember.moderatable) {
      return interaction.editReply(
        "I cannot unmute this user. They may have a higher role than me or I lack permissions."
      );
    }
    if (!targetMember.isCommunicationDisabled()) {
      return interaction.editReply("This user is not currently muted.");
    }

    // --- Action ---
    try {
      await targetMember.timeout(null, reason); // Pass null to remove timeout

      const embed = new EmbedBuilder()
        .setColor("Green")
        .setTitle("User Unmuted")
        .setDescription(`Successfully unmuted **${targetUser.tag}**.`)
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.editReply(
        "An error occurred while trying to unmute this user."
      );
    }
  },
};
