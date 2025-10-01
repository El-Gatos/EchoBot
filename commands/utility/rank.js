const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Displays your or another user's server rank.")
    .addUserOption((option) =>
      option.setName("user").setDescription("The user to check the rank of")
    ),
  async execute(interaction) {
    const targetUser = interaction.options.getUser("user") || interaction.user;
    const db = interaction.client.db;
    const guildId = interaction.guild.id;

    const userRef = db
      .collection("guilds")
      .doc(guildId)
      .collection("levels")
      .doc(targetUser.id);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return interaction.editReply(
        `${targetUser.tag} has not gained any XP yet.`
      );
    }

    const userData = userDoc.data();
    const xpToNextLevel = 5 * userData.level ** 2 + 50 * userData.level + 100;

    // Fetch all users to determine rank
    const allUsersSnapshot = await db
      .collection("guilds")
      .doc(guildId)
      .collection("levels")
      .orderBy("xp", "desc")
      .get();
    const rank =
      allUsersSnapshot.docs.findIndex((doc) => doc.id === targetUser.id) + 1;

    const rankEmbed = new EmbedBuilder()
      .setColor("Aqua")
      .setAuthor({
        name: `Rank for ${targetUser.tag}`,
        iconURL: targetUser.displayAvatarURL(),
      })
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        { name: "Level", value: userData.level.toString(), inline: true },
        {
          name: "XP",
          value: `${userData.xp} / ${xpToNextLevel}`,
          inline: true,
        },
        { name: "Rank", value: `#${rank}`, inline: true }
      );

    await interaction.editReply({ embeds: [rankEmbed] });
  },
};
