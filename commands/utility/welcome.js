const {
  SlashCommandBuilder,
  PermissionsBitField,
  ChannelType,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("welcome")
    .setDescription("Configures the server welcome system.")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("status")
        .setDescription("Displays the current welcome configuration.")
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("enable").setDescription("Enables the welcome system.")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("disable")
        .setDescription("Disables the welcome system.")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("setchannel")
        .setDescription("Sets the channel where welcome messages are sent.")
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("The channel to set")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("setmessage")
        .setDescription(
          "Sets the welcome message. Use placeholders for customization."
        )
        .addStringOption((option) =>
          option
            .setName("message")
            .setDescription(
              "Placeholders: {user} (mention), {username}, {server}"
            )
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("test")
        .setDescription(
          "Sends a test welcome message to the configured channel."
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
      .doc("welcome");

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    switch (subcommand) {
      case "enable":
        await configRef.set({ enabled: true }, { merge: true });
        return interaction.editReply("✅ Welcome system has been enabled.");

      case "disable":
        await configRef.set({ enabled: false }, { merge: true });
        return interaction.editReply("❌ Welcome system has been disabled.");

      case "setchannel":
        const channel = interaction.options.getChannel("channel");
        await configRef.set({ channelId: channel.id }, { merge: true });
        return interaction.editReply(
          `✅ Welcome channel has been set to ${channel}.`
        );

      case "setmessage":
        const message = interaction.options.getString("message");
        await configRef.set({ message: message }, { merge: true });
        return interaction.editReply(
          `✅ Welcome message has been updated.\n**Preview:** ${message}`
        );

      case "status": {
        const doc = await configRef.get();
        const config = doc.data() || {};
        const statusEmbed = new EmbedBuilder()
          .setColor(config.enabled ? "Green" : "Red")
          .setTitle("Welcome System Status")
          .addFields(
            { name: "Status", value: config.enabled ? "Enabled" : "Disabled" },
            {
              name: "Channel",
              value: config.channelId ? `<#${config.channelId}>` : "Not Set",
            },
            {
              name: "Message",
              value: `\`\`\`${config.message || "Not Set"}\`\`\``,
            }
          );
        return interaction.editReply({ embeds: [statusEmbed] });
      }

      case "test": {
        const doc = await configRef.get();
        const config = doc.data();

        if (!config?.enabled || !config.channelId || !config.message) {
          return interaction.editReply(
            "Cannot send test message. Please ensure the system is enabled and both a channel and message are set."
          );
        }

        const testChannel = await interaction.guild.channels.fetch(
          config.channelId
        );
        if (!testChannel) {
          return interaction.editReply(
            "The configured welcome channel could not be found. Please set it again."
          );
        }

        const user = interaction.user;
        const server = interaction.guild.name;
        let welcomeMessage = config.message
          .replace("{user}", user)
          .replace("{username}", user.username)
          .replace("{server}", server);

        const welcomeEmbed = new EmbedBuilder()
          .setColor("Aqua")
          .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
          .setDescription(welcomeMessage)
          .setThumbnail(user.displayAvatarURL())
          .setTimestamp();

        await testChannel.send({ embeds: [welcomeEmbed] });
        return interaction.editReply(`✅ Test message sent to ${testChannel}.`);
      }
    }
  },
};
