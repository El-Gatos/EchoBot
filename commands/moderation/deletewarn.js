const { FieldValue } = require("firebase-admin/firestore");
const {
  SlashCommandBuilder,
  PermissionsBitField,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("deletewarn")
    .setDescription("Deletes a specific warning for a user by its ID.")
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("The user to remove a warning from")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("warnid")
        .setDescription("The ID of the warning to delete")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),

  async execute(interaction) {
    const targetUser = interaction.options.getUser("target");
    const warnId = interaction.options.getString("warnid");
    const db = interaction.client.db;

    const userWarningsRef = db
      .collection("guilds")
      .doc(interaction.guild.id)
      .collection("warnings")
      .doc(targetUser.id);

    try {
      const doc = await userWarningsRef.get();

      if (!doc.exists) {
        return interaction.editReply({
          content: `${targetUser.tag} has no warnings.`,
        });
      }

      const warnings = doc.data();
      if (!warnings[warnId]) {
        return interaction.editReply({
          content: `Warning ID \`${warnId}\` was not found for this user.`,
        });
      }

      // Prepare the update to delete the specific warning field using FieldValue.delete()
      const updateData = {
        [warnId]: FieldValue.delete(),
      };

      await userWarningsRef.update(updateData);

      const embed = new EmbedBuilder()
        .setColor("Red")
        .setTitle("Warning Deleted")
        .setDescription(
          `Successfully deleted warning \`${warnId}\` for **${targetUser.tag}**.`
        )
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.editReply({
        content: "An error occurred while trying to delete the warning.",
      });
    }
  },
};
