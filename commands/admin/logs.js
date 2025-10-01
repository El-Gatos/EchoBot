const {
  SlashCommandBuilder,
  PermissionsBitField,
  ChannelType,
  EmbedBuilder,
  InteractionContextType,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("logs")
    .setDescription("Configures the server logging system.")
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(
      PermissionsBitField.Flags.ManageGuild |
        PermissionsBitField.Flags.Administrator
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("status")
        .setDescription("Displays the current logging configuration.")
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("enable").setDescription("Enables the logging system.")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("disable")
        .setDescription("Disables the logging system.")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("setchannel")
        .setDescription("Sets the channel where logs are sent.")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("The channel to set")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const db = interaction.client.db;
    const guildId = interaction.guild.id;
    const configRef = db
      .collection("guilds")
      .doc(guildId)
      .collection("config")
      .doc("logging");

    switch (subcommand) {
      case "enable":
        await configRef.set({ enabled: true }, { merge: true });
        return interaction.editReply("✅ Logging system has been enabled.");

      case "disable":
        await configRef.set({ enabled: false }, { merge: true });
        return interaction.editReply("❌ Logging system has been disabled.");

      case "setchannel":
        const channel = interaction.options.getChannel("channel");
        await configRef.set({ channelId: channel.id }, { merge: true });
        return interaction.editReply(
          `✅ Log channel has been set to ${channel}.`
        );

      case "status": {
        const doc = await configRef.get();
        const config = doc.data() || {};
        const statusEmbed = new EmbedBuilder()
          .setColor(config.enabled ? "Green" : "Red")
          .setTitle("Logging System Status")
          .addFields(
            { name: "Status", value: config.enabled ? "Enabled" : "Disabled" },
            {
              name: "Log Channel",
              value: config.channelId ? `<#${config.channelId}>` : "Not Set",
            }
          );
        return interaction.editReply({ embeds: [statusEmbed] });
      }
    }
  },
};
