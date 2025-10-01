const {
  SlashCommandBuilder,
  PermissionsBitField,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("warnings")
    .setDescription("Displays all warnings for a user.")
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("The user to check warnings for")
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
      return interaction.editReply(`${targetUser.tag} has no warnings.`);
    }

    const warnings = doc.data();
    const embed = new EmbedBuilder()
      .setColor("Blue")
      .setTitle(`Warnings for ${targetUser.tag}`)
      .setDescription(`Found ${Object.keys(warnings).length} warning(s).`);

    // Add a field for each warning
    for (const warnId in warnings) {
      const warning = warnings[warnId];
      const moderator = await interaction.client.users.fetch(warning.moderator);
      embed.addFields({
        name: `ID: ${warnId}`,
        value: `**Reason:** ${warning.reason}\n**Moderator:** ${moderator.tag}`,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
