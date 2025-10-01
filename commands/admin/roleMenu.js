const {
  SlashCommandBuilder,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rolemenu")
    .setDescription("Creates a self-assignable role menu.")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageRoles)
    .addStringOption((option) =>
      option
        .setName("title")
        .setDescription("The title of the role menu embed")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("description")
        .setDescription("The description text for the embed")
        .setRequired(true)
    )
    .addRoleOption((option) =>
      option
        .setName("role1")
        .setDescription("The first role to add")
        .setRequired(true)
    )
    .addRoleOption((option) =>
      option.setName("role2").setDescription("The second role to add")
    )
    .addRoleOption((option) =>
      option.setName("role3").setDescription("The third role to add")
    )
    .addRoleOption((option) =>
      option.setName("role4").setDescription("The fourth role to add")
    )
    .addRoleOption((option) =>
      option.setName("role5").setDescription("The fifth role to add")
    ),

  async execute(interaction) {
    const title = interaction.options.getString("title");
    const description = interaction.options.getString("description");
    const roles = [];
    for (let i = 1; i <= 5; i++) {
      const role = interaction.options.getRole(`role${i}`);
      if (role) roles.push(role);
    }

    if (roles.length === 0) {
      return interaction.editReply("You must provide at least one role.");
    }

    // --- Hierarchy Check ---
    const botMember = await interaction.guild.members.fetch(
      interaction.client.user.id
    );
    for (const role of roles) {
      if (role.position >= botMember.roles.highest.position) {
        return interaction.editReply(
          `I cannot manage the role **${role.name}** because it is higher than or equal to my highest role.`
        );
      }
    }

    const embed = new EmbedBuilder()
      .setColor("Aqua")
      .setTitle(title)
      .setDescription(description);

    const row = new ActionRowBuilder();
    roles.forEach((role) => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`rolemenu_${role.id}`)
          .setLabel(role.name)
          .setStyle(ButtonStyle.Secondary)
      );
    });

    await interaction.channel.send({ embeds: [embed], components: [row] });
    await interaction.editReply("✅ Role menu has been created successfully!");
  },
};
