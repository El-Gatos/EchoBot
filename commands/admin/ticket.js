const {
  SlashCommandBuilder,
  PermissionsBitField,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  InteractionContextType,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Manages the ticket system.")
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("setup")
        .setDescription("Sets up the ticket creation panel.")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("The channel to send the ticket creation panel to")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
        .addChannelOption((option) =>
          option
            .setName("category")
            .setDescription("The category to create ticket channels in")
            .addChannelTypes(ChannelType.GuildCategory)
            .setRequired(true)
        )
        .addRoleOption((option) =>
          option
            .setName("support_role")
            .setDescription("The role that can see and manage tickets")
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "setup") {
      const channel = interaction.options.getChannel("channel");
      const category = interaction.options.getChannel("category");
      const supportRole = interaction.options.getRole("support_role");

      const db = interaction.client.db;
      const configRef = db
        .collection("guilds")
        .doc(interaction.guild.id)
        .collection("config")
        .doc("tickets");

      // Save the configuration
      await configRef.set({
        categoryId: category.id,
        supportRoleId: supportRole.id,
      });

      const embed = new EmbedBuilder()
        .setColor("Blue")
        .setTitle("Create a Support Ticket")
        .setDescription(
          "Click the button below to open a private ticket with the support team."
        );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("ticket_create")
          .setLabel("Create Ticket")
          .setStyle(ButtonStyle.Success)
          .setEmoji("🎟️")
      );

      await channel.send({ embeds: [embed], components: [row] });
      await interaction.editReply({
        content: `✅ Ticket system panel has been created in ${channel}.`,
      });
    }
  },
};
