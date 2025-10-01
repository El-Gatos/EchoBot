const {
  SlashCommandBuilder,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  InteractionContextType,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("xpreset")
    .setDescription("Resets XP and levels.")
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("all")
        .setDescription("Resets all XP and levels for everyone in the server.")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("user")
        .setDescription("Resets XP and level for a specific user.")
        .addUserOption((option) =>
          option
            .setName("target")
            .setDescription("The user to reset")
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const db = interaction.client.db;

    if (subcommand === "all") {
      const embed = new EmbedBuilder()
        .setColor("Red")
        .setTitle("⚠️ Confirmation Required ⚠️")
        .setDescription(
          "Are you sure you want to reset all XP and levels for this server?\n**This action cannot be undone.**"
        );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("xpreset_confirm")
          .setLabel("Confirm Reset")
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId("xpreset_cancel")
          .setLabel("Cancel")
          .setStyle(ButtonStyle.Secondary)
      );

      await interaction.editReply({ embeds: [embed], components: [row] });
    } else if (subcommand === "user") {
      const targetUser = interaction.options.getUser("target");
      const userRef = db
        .collection("guilds")
        .doc(interaction.guild.id)
        .collection("levels")
        .doc(targetUser.id);

      const doc = await userRef.get();
      if (!doc.exists) {
        return interaction.editReply(
          `${targetUser.tag} has no XP data to reset.`
        );
      }

      await userRef.delete();

      const embed = new EmbedBuilder()
        .setColor("Green")
        .setTitle("User XP Reset")
        .setDescription(
          `Successfully reset all XP and level data for **${targetUser.tag}**.`
        );

      await interaction.editReply({ embeds: [embed] });
    }
  },
};
