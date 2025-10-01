const {
  SlashCommandBuilder,
  PermissionsBitField,
  EmbedBuilder,
  InteractionContextType,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warns a member and logs the warning.")
    .setContexts(InteractionContextType.Guild)
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("The user to warn")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("The reason for the warning")
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ModerateMembers),

  async execute(interaction) {
    const targetUser = interaction.options.getUser("target");
    const reason = interaction.options.getString("reason");
    const db = interaction.client.db;

    // Generate a unique warning ID (using timestamp for simplicity)
    const warnId = Date.now().toString();

    const warningData = {
      reason: reason,
      moderator: interaction.user.id,
      timestamp: new Date(),
    };

    // The path to the user's document in Firestore
    const userWarningsRef = db
      .collection("guilds")
      .doc(interaction.guild.id)
      .collection("warnings")
      .doc(targetUser.id);

    // Use 'set' with 'merge: true' to create or update the user's doc
    await userWarningsRef.set(
      {
        [warnId]: warningData,
      },
      { merge: true }
    );

    const embed = new EmbedBuilder()
      .setColor("Yellow")
      .setTitle("User Warned")
      .setDescription(`Successfully warned **${targetUser.tag}**.`)
      .addFields(
        { name: "Reason", value: reason },
        { name: "Moderator", value: interaction.user.tag }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
