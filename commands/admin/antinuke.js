const {
  SlashCommandBuilder,
  PermissionsBitField,
  EmbedBuilder,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("antinuke")
    .setDescription("Configures the server's anti-nuke protection system.")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("status")
        .setDescription("Displays the current anti-nuke configuration.")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("toggle")
        .setDescription("Enables or disables the anti-nuke system.")
        .addBooleanOption((option) =>
          option
            .setName("enabled")
            .setDescription("Set to true to enable, false to disable.")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("thresholds")
        .setDescription("Sets the action limits for the anti-nuke system.")
        .addStringOption((option) =>
          option
            .setName("type")
            .setDescription("The type of action to set a limit for.")
            .setRequired(true)
            .addChoices(
              // These values MUST match what the event listeners use.
              { name: "Channel Deletions", value: "channelDeletes" },
              { name: "Role Deletions", value: "roleDeletes" },
              { name: "Member Bans", value: "memberBans" }
            )
        )
        .addIntegerOption((option) =>
          option
            .setName("limit")
            .setDescription("How many actions are allowed.")
            .setRequired(true)
            .setMinValue(1)
        )
        .addIntegerOption((option) =>
          option
            .setName("interval")
            .setDescription("Within how many seconds.")
            .setRequired(true)
            .setMinValue(5)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("whitelist")
        .setDescription(
          "Manages the user whitelist (users exempt from anti-nuke)."
        )
        .addStringOption((option) =>
          option
            .setName("action")
            .setDescription("Add or remove a user.")
            .setRequired(true)
            .addChoices(
              { name: "add", value: "add" },
              { name: "remove", value: "remove" }
            )
        )
        .addUserOption((option) =>
          option
            .setName("user")
            .setDescription("The user to add or remove.")
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    if (interaction.user.id !== interaction.guild.ownerId) {
      return interaction.editReply({
        content: "Only the server owner can manage the anti-nuke system.",
        ephemeral: true,
      });
    }

    const subcommand = interaction.options.getSubcommand();
    const db = interaction.client.db;
    const configRef = db
      .collection("guilds")
      .doc(interaction.guild.id)
      .collection("config")
      .doc("antinuke");

    switch (subcommand) {
      case "toggle": {
        const enabled = interaction.options.getBoolean("enabled");
        await configRef.set({ enabled: enabled }, { merge: true });
        return interaction.editReply(
          `✅ Anti-nuke system has been **${
            enabled ? "enabled" : "disabled"
          }**.`
        );
      }

      case "thresholds": {
        const type = interaction.options.getString("type");
        const limit = interaction.options.getInteger("limit");
        const interval = interaction.options.getInteger("interval");

        await configRef.set(
          {
            limits: {
              [type]: { limit, interval },
            },
          },
          { merge: true }
        );

        return interaction.editReply(
          `✅ Anti-nuke thresholds for **${type}** set to **${limit} actions** within **${interval} seconds**.`
        );
      }

      case "whitelist": {
        const action = interaction.options.getString("action");
        const user = interaction.options.getUser("user");
        const { FieldValue } = require("firebase-admin/firestore");

        if (action === "add") {
          await configRef.set(
            { whitelist: FieldValue.arrayUnion(user.id) },
            { merge: true }
          );
          return interaction.editReply(
            `✅ **${user.tag}** has been added to the anti-nuke whitelist.`
          );
        } else if (action === "remove") {
          await configRef.set(
            { whitelist: FieldValue.arrayRemove(user.id) },
            { merge: true }
          );
          return interaction.editReply(
            `✅ **${user.tag}** has been removed from the anti-nuke whitelist.`
          );
        }
        break;
      }

      case "status": {
        const doc = await configRef.get();
        const config = doc.data() || {};

        const formatLimit = (type) => {
          if (config.limits && config.limits[type]) {
            const { limit, interval } = config.limits[type];
            return `**${limit}** actions / **${interval}s**`;
          }
          return "Not Set";
        };

        const whitelistUsers = config.whitelist
          ? config.whitelist.map((id) => `<@${id}>`).join("\n") || "None"
          : "None";

        const statusEmbed = new EmbedBuilder()
          .setColor(config.enabled ? "Green" : "Red")
          .setTitle("🛡️ Anti-Nuke System Status")
          .addFields(
            {
              name: "System Status",
              value: config.enabled ? "**Enabled**" : "**Disabled**",
            },
            {
              name: "Channel Deletion Limit",
              value: formatLimit("channelDeletes"),
              inline: true,
            },
            {
              name: "Role Deletion Limit",
              value: formatLimit("roleDeletes"),
              inline: true,
            },
            {
              name: "Member Ban Limit",
              value: formatLimit("memberBans"),
              inline: true,
            },
            { name: "Whitelisted Users", value: whitelistUsers }
          );

        return interaction.editReply({ embeds: [statusEmbed] });
      }
    }
  },
};
