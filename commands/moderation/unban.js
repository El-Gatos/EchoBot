const {
  SlashCommandBuilder,
  PermissionsBitField,
  EmbedBuilder,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unban")
    .setDescription("Unbans a user from the server.")
    .addStringOption((option) =>
      option
        .setName("userid")
        .setDescription("The ID of the user to unban")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionsBitField.Flags.BanMembers),
  isPublic: true,
  async execute(interaction) {
    const userId = interaction.options.getString("userid");

    try {
      // --- NEW: Check if the user is actually banned ---
      const banList = await interaction.guild.bans.fetch();
      const bannedUser = banList.get(userId);

      if (!bannedUser) {
        return interaction.editReply("That user is not on the ban list.");
      }
      // --- END OF NEW CODE ---

      // Attempt to unban the user
      await interaction.guild.bans.remove(userId);

      const embed = new EmbedBuilder()
        .setColor("Green")
        .setTitle("User Unbanned")
        .setDescription(
          `Successfully unbanned **${bannedUser.user.tag}** (ID: ${userId}).`
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.editReply(
        "An error occurred. I may be missing permissions to fetch the ban list or unban members."
      );
    }
  },
};
