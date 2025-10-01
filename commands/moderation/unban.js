const {
  SlashCommandBuilder,
  PermissionsBitField,
  EmbedBuilder,
  MessageFlags,
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

  async execute(interaction) {
    const userId = interaction.options.getString("userid");

    try {
      // Fetch the user to confirm they exist
      const bannedUser = await interaction.client.users.fetch(userId);

      // Attempt to unban the user
      await interaction.guild.bans.remove(userId);

      const embed = new EmbedBuilder()
        .setColor("Green")
        .setTitle("User Unbanned")
        .setDescription(
          `Successfully unbanned **${bannedUser.tag}** (ID: ${userId}).`
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.editReply(
        "Could not unban the user. Make sure you've provided a valid User ID and that the user is actually banned."
      );
    }
  },
};
