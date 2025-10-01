const {
  SlashCommandBuilder,
  EmbedBuilder,
  InteractionContextType,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("Displays the server's XP leaderboard.")
    .setContexts(InteractionContextType.Guild),
  async execute(interaction) {
    const db = interaction.client.db;
    const guildId = interaction.guild.id;

    const allUsersSnapshot = await db
      .collection("guilds")
      .doc(guildId)
      .collection("levels")
      .orderBy("xp", "desc")
      .limit(10)
      .get();

    if (allUsersSnapshot.empty) {
      return interaction.editReply("No one is on the leaderboard yet.");
    }

    let description = "";
    let rank = 1;

    for (const doc of allUsersSnapshot.docs) {
      const user = await interaction.client.users
        .fetch(doc.id)
        .catch(() => null);
      if (user) {
        description += `**${rank}.** ${user.tag} - **Level ${
          doc.data().level
        }** (${doc.data().xp} XP)\n`;
      }
      rank++;
    }

    const leaderboardEmbed = new EmbedBuilder()
      .setColor("Gold")
      .setTitle(`Leaderboard for ${interaction.guild.name}`)
      .setDescription(description)
      .setTimestamp();

    await interaction.editReply({ embeds: [leaderboardEmbed] });
  },
};
