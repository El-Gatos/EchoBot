const {
  SlashCommandBuilder,
  PermissionsBitField,
  ChannelType,
  EmbedBuilder,
  InteractionContextType,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leveling")
    .setDescription("Configures the server leveling system.")
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("status")
        .setDescription("Displays the current leveling configuration.")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("enable")
        .setDescription("Enables the leveling system.")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("disable")
        .setDescription("Disables the leveling system.")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("setchannel")
        .setDescription("Sets the channel for level-up announcements.")
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
      .doc("leveling");

    switch (subcommand) {
      case "enable":
        await configRef.set({ enabled: true }, { merge: true });
        return interaction.editReply("✅ Leveling system has been enabled.");

      case "disable":
        await configRef.set({ enabled: false }, { merge: true });
        return interaction.editReply("❌ Leveling system has been disabled.");

      case "setchannel":
        const channel = interaction.options.getChannel("channel");
        await configRef.set({ channelId: channel.id }, { merge: true });
        return interaction.editReply(
          `✅ Level-up announcement channel has been set to ${channel}.`
        );

      case "status": {
        const doc = await configRef.get();
        const config = doc.data() || {};
        const statusEmbed = new EmbedBuilder()
          .setColor(config.enabled ? "Green" : "Red")
          .setTitle("Leveling System Status")
          .addFields(
            { name: "Status", value: config.enabled ? "Enabled" : "Disabled" },
            {
              name: "Announcement Channel",
              value: config.channelId ? `<#${config.channelId}>` : "Not Set",
            }
          );
        return interaction.editReply({ embeds: [statusEmbed] });
      }
    }
  },
};
