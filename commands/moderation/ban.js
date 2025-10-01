const {
  SlashCommandBuilder,
  PermissionsBitField,
  EmbedBuilder,
  MessageFlags,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Bans a member from the server.")
    .addUserOption((option) =>
      option
        .setName("target")
        .setDescription("The user to ban")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("The reason for the ban")
    )
    .setDefaultMemberPermissions(PermissionsBitField.Flags.BanMembers),

  async execute(interaction) {
    const targetUser = interaction.options.getUser("target");
    const reason =
      interaction.options.getString("reason") || "No reason provided";

    // Fetch the member from the guild
    const targetMember = await interaction.guild.members.fetch(targetUser.id);

    // --- Permission and Hierarchy Checks ---
    if (!targetMember) {
      return interaction.editReply("That user doesn't exist in this server.");
    }
    if (!targetMember.bannable) {
      return interaction.editReply(
        "I cannot ban this user. They may have a higher role than me or I lack permissions."
      );
    }
    if (targetUser.id === interaction.user.id) {
      return interaction.editReply("You cannot ban yourself.");
    }

    // --- Action ---
    try {
      // Attempt to DM the user before banning
      await targetUser.send(
        `You have been banned from **${interaction.guild.name}** for the following reason: ${reason}`
      );
    } catch (error) {
      console.log(`Could not DM user ${targetUser.tag}.`);
    }

    // Ban the user
    await targetMember.ban({ reason: reason });

    const embed = new EmbedBuilder()
      .setColor("Red")
      .setTitle("User Banned")
      .setDescription(`Successfully banned **${targetUser.tag}**.`)
      .addFields(
        { name: "Reason", value: reason },
        { name: "Moderator", value: interaction.user.tag }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
