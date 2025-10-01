const {
  SlashCommandBuilder,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("xpreset")
    .setDescription("Resets all XP and levels for everyone in the server.")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),

  async execute(interaction) {
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
  },
};
