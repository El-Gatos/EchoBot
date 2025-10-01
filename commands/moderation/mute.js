const {
  SlashCommandBuilder,
  PermissionsBitField,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");

// Helper function to parse time strings (e.g., "10m", "1h", "1d") into milliseconds
function parseTime(timeString) {
  const unit = timeString.slice(-1);
  const amount = parseInt(timeString.slice(0, -1));

  if (isNaN(amount)) return null;

  switch (unit) {
    case "m":
      return amount * 60 * 1000;
    case "h":
      return amount * 60 * 60 * 1000;
    case "d":
      return amount * 24 * 60 * 60 * 1000;
    default:
      return null;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mute")
    .setDescription("Mutes a member, preventing them from talking.")
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("The user to mute")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("duration")
        .setDescription("Duration of the mute (e.g., 5m, 1h, 1d)")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("The reason for the mute")
    )
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),

  async execute(interaction) {
    const targetUser = interaction.options.getUser("target");
    const durationString = interaction.options.getString("duration");
    const reason =
      interaction.options.getString("reason") || "No reason provided";

    const targetMember = await interaction.guild.members.fetch(targetUser.id);
    const durationMs = parseTime(durationString);
    const maxTimeoutMs = 28 * 24 * 60 * 60 * 1000; // 28 days in milliseconds

    // --- Validation ---
    if (!targetMember) {
      return interaction.editReply("That user doesn't exist in this server.");
    }
    if (!targetMember.moderatable) {
      return interaction.editReply(
        "I cannot mute this user. They may have a higher role than me or I lack permissions."
      );
    }
    if (targetMember.isCommunicationDisabled()) {
      return interaction.editReply("This user is already muted.");
    }
    if (!durationMs || durationMs < 60000 || durationMs > maxTimeoutMs) {
      // Min 1 minute, Max 28 days
      return interaction.editReply(
        "Please provide a valid duration (e.g., 1m, 2h, 7d). The maximum is 28 days."
      );
    }

    // --- Action ---
    try {
      await targetMember.timeout(durationMs, reason);

      const embed = new EmbedBuilder()
        .setColor("Orange")
        .setTitle("User Muted")
        .setDescription(
          `Successfully muted **${targetUser.tag}** for **${durationString}**.`
        )
        .addFields(
          { name: "Reason", value: reason },
          { name: "Moderator", value: interaction.user.tag }
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.editReply(
        "An error occurred while trying to mute this user."
      );
    }
  },
};
