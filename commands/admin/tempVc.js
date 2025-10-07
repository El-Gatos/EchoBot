const {
  SlashCommandBuilder,
  PermissionsBitField,
  ChannelType,
  EmbedBuilder,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("tempvc")
    .setDescription("Manages the temporary voice channel system.")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("setup")
        .setDescription(
          "Automatically creates or sets up the channels for the Temp VC system."
        )
        .addChannelOption((option) =>
          option // This is the new optional argument
            .setName("category")
            .setDescription("Optional: The category to create the channels in.")
            .addChannelTypes(ChannelType.GuildCategory)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("toggle")
        .setDescription("Enables or disables the temporary VC system.")
        .addBooleanOption((option) =>
          option
            .setName("enabled")
            .setDescription("Set to true to enable, false to disable")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("status")
        .setDescription(
          "Checks the status of the temporary voice channel system."
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const db = interaction.client.db;
    const configRef = db
      .collection("guilds")
      .doc(interaction.guild.id)
      .collection("config")
      .doc("tempVC");

    if (subcommand === "setup") {
      try {
        let category = interaction.options.getChannel("category");

        // If no category is provided, create a new one.
        if (!category) {
          category = await interaction.guild.channels.create({
            name: "🎧 Voice Channels",
            type: ChannelType.GuildCategory,
          });
        }

        // Create the "Join to Create" hub channel inside the chosen/new category
        const hubChannel = await interaction.guild.channels.create({
          name: "➕ Join to Create",
          type: ChannelType.GuildVoice,
          parent: category.id,
        });

        // Create the text channel for control panels
        const controlChannel = await interaction.guild.channels.create({
          name: "🎤-vc-controls",
          type: ChannelType.GuildText,
          parent: category.id,
          permissionOverwrites: [
            {
              // Prevent @everyone from sending messages
              id: interaction.guild.roles.everyone,
              deny: [PermissionsBitField.Flags.SendMessages],
            },
            {
              // Allow the bot to send messages and manage them
              id: interaction.client.user.id,
              allow: [
                PermissionsBitField.Flags.SendMessages,
                PermissionsBitField.Flags.ManageMessages,
                PermissionsBitField.Flags.EmbedLinks,
              ],
            },
          ],
        });

        // Save the new channel IDs to the database
        await configRef.set(
          {
            hubChannelId: hubChannel.id,
            controlChannelId: controlChannel.id,
            enabled: true,
          },
          { merge: true }
        );

        const embed = new EmbedBuilder()
          .setColor("Green")
          .setTitle("✅ Temp VC System Setup Complete")
          .setDescription(
            `The necessary channels have been created in the **${category.name}** category. The system is now active.`
          );

        return interaction.editReply({ embeds: [embed] });
      } catch (error) {
        console.error("Failed to setup Temp VC system:", error);
        return interaction.editReply(
          "I seem to be missing permissions to create channels or categories. Please check my role permissions."
        );
      }
    }

    // --- (The rest of the command is unchanged) ---
    if (subcommand === "toggle") {
      const enabled = interaction.options.getBoolean("enabled");
      await configRef.set({ enabled: enabled }, { merge: true });
      return interaction.editReply(
        `✅ Temporary VC system has been **${
          enabled ? "enabled" : "disabled"
        }**.`
      );
    }

    if (subcommand === "status") {
      const doc = await configRef.get();
      const config = doc.data() || {};
      let hubChannelName = "Not Set";
      let controlChannelName = "Not Set";

      if (config.hubChannelId) {
        const channel = await interaction.guild.channels
          .fetch(config.hubChannelId)
          .catch(() => null);
        hubChannelName = channel ? channel.name : "Channel Deleted";
      }
      if (config.controlChannelId) {
        const channel = await interaction.guild.channels
          .fetch(config.controlChannelId)
          .catch(() => null);
        controlChannelName = channel ? channel.name : "Channel Deleted";
      }

      const statusEmbed = new EmbedBuilder()
        .setColor(config.enabled ? "Green" : "Red")
        .setTitle("🔊 Temporary VC Status")
        .addFields(
          { name: "Status", value: config.enabled ? "Enabled" : "Disabled" },
          { name: "Hub Channel", value: hubChannelName, inline: true },
          { name: "Controls Channel", value: controlChannelName, inline: true }
        );
      return interaction.editReply({ embeds: [statusEmbed] });
    }
  },
};
