const {
  SlashCommandBuilder,
  EmbedBuilder,
  InteractionContextType,
} = require("discord.js");

// Helper function to get the TOTAL XP needed to reach a certain level
function getXpForLevel(level) {
  let totalXp = 0;
  for (let i = 0; i < level; i++) {
    totalXp += 5 * i ** 2 + 50 * i + 100;
  }
  return totalXp;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Displays your or another user's server rank.")
    .setContexts(InteractionContextType.Guild)
    .addUserOption((option) =>
      option.setName("user").setDescription("The user to check the rank of")
    ),
  isPublic: true,
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

    // --- CORRECTED DISPLAY LOGIC ---
    const xpForCurrentLevel = getXpForLevel(userData.level);
    const xpForNextLevel = getXpForLevel(userData.level + 1);

    const xpInCurrentLevel = userData.xp - xpForCurrentLevel;
    const xpNeededForLevelUp = xpForNextLevel - xpForCurrentLevel;
    // --- END OF CHANGES ---

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
          value: `${xpInCurrentLevel} / ${xpNeededForLevelUp}`,
          inline: true,
        },
        { name: "Rank", value: `#${rank}`, inline: true }
      );

    await interaction.editReply({ embeds: [rankEmbed] });
  },
};
