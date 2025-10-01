const {
  SlashCommandBuilder,
  EmbedBuilder,
  InteractionContextType,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Provides information about the user.")
    .setContexts(InteractionContextType.Guild)
    .addUserOption((option) =>
      option.setName("target").setDescription("The user to get info about")
    ),

  async execute(interaction) {
    // Get the target user, or default to the user who ran the command
    const targetUser =
      interaction.options.getUser("target") || interaction.user;
    // Fetch the GuildMember object to get server-specific details
    const targetMember = await interaction.guild.members.fetch(targetUser.id);

    // Create a new EmbedBuilder instance
    const userEmbed = new EmbedBuilder()
      .setColor(targetMember.displayHexColor || "#0099ff") // Use role color or a default
      .setTitle(`Information for ${targetUser.username}`)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: "Username", value: `\`${targetUser.tag}\``, inline: true },
        { name: "User ID", value: `\`${targetUser.id}\``, inline: true },
        { name: "Bot?", value: targetUser.bot ? "Yes" : "No", inline: true },
        {
          name: "Roles",
          value: targetMember.roles.cache.map((r) => r).join(" ") || "None",
        },
        {
          name: "Joined Server",
          value: `<t:${parseInt(targetMember.joinedTimestamp / 1000)}:R>`,
          inline: true,
        },
        {
          name: "Account Created",
          value: `<t:${parseInt(targetUser.createdTimestamp / 1000)}:R>`,
          inline: true,
        }
      )
      .setTimestamp()
      .setFooter({
        text: `Requested by ${interaction.user.username}`,
        iconURL: interaction.user.displayAvatarURL({ dynamic: true }),
      });

    await interaction.editReply({ embeds: [userEmbed] });
  },
};
