const {
  SlashCommandBuilder,
  PermissionsBitField,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("autorole")
    .setDescription("Configures the autorole system.")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageRoles)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("status")
        .setDescription("Displays the current autorole configuration.")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("enable")
        .setDescription("Enables the autorole system.")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("disable")
        .setDescription("Disables the autorole system.")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("set")
        .setDescription("Sets the role to be given to new members.")
        .addRoleOption((option) =>
          option
            .setName("role")
            .setDescription("The role to assign")
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
      .doc("autorole");

    switch (subcommand) {
      case "enable":
        await configRef.set({ enabled: true }, { merge: true });
        return interaction.editReply("✅ Autorole system has been enabled.");

      case "disable":
        await configRef.set({ enabled: false }, { merge: true });
        return interaction.editReply("❌ Autorole system has been disabled.");

      case "set": {
        const role = interaction.options.getRole("role");
        const botMember = await interaction.guild.members.fetch(
          interaction.client.user.id
        );

        // --- Hierarchy Check ---
        if (role.position >= botMember.roles.highest.position) {
          return interaction.editReply({
            content:
              "I cannot assign this role because it is higher than or equal to my highest role. Please move my role above the one you want me to assign.",
          });
        }
        if (role.managed) {
          return interaction.editReply({
            content:
              "I cannot assign this role because it is managed by an integration.",
          });
        }

        await configRef.set({ roleId: role.id }, { merge: true });
        return interaction.editReply(
          `✅ Autorole has been set to the **${role.name}** role.`
        );
      }

      case "status": {
        const doc = await configRef.get();
        const config = doc.data() || {};
        let roleName = "Not Set";
        if (config.roleId) {
          const role = await interaction.guild.roles
            .fetch(config.roleId)
            .catch(() => null);
          if (role) roleName = role.name;
          else roleName = "Role not found (deleted?)";
        }

        const statusEmbed = new EmbedBuilder()
          .setColor(config.enabled ? "Green" : "Red")
          .setTitle("Autorole System Status")
          .addFields(
            { name: "Status", value: config.enabled ? "Enabled" : "Disabled" },
            { name: "Assigned Role", value: roleName }
          );
        return interaction.editReply({ embeds: [statusEmbed] });
      }
    }
  },
};
