const {
  SlashCommandBuilder,
  PermissionsBitField,
  EmbedBuilder,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("clearwarns")
    .setDescription("Clears all warnings for a user.")
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("The user to clear warnings for")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),

  async execute(interaction) {
    const targetUser = interaction.options.getUser("target");
    const db = interaction.client.db;

    const userWarningsRef = db
      .collection("guilds")
      .doc(interaction.guild.id)
      .collection("warnings")
      .doc(targetUser.id);
    const doc = await userWarningsRef.get();

    if (!doc.exists) {
      return interaction.editReply(
        `${targetUser.tag} has no warnings to clear.`
      );
    }

    await userWarningsRef.delete();

    const embed = new EmbedBuilder()
      .setColor("Green")
      .setTitle("Warnings Cleared")
      .setDescription(
        `Successfully cleared all warnings for **${targetUser.tag}**.`
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
