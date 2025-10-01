const {
  SlashCommandBuilder,
  PermissionsBitField,
  EmbedBuilder,
} = require("discord.js");

// This function calculates the level based on total XP.
// It's the reverse of our XP-to-next-level formula.
function calculateLevel(xp) {
  let level = 0;
  let requiredXp = 100;
  let totalXpForNextLevel = 100;

  while (xp >= totalXpForNextLevel) {
    level++;
    requiredXp = 5 * level ** 2 + 50 * level + 100;
    totalXpForNextLevel += requiredXp;
  }
  return level;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("xpset")
    .setDescription("Sets a user's XP and recalculates their level.")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to modify")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("xp")
        .setDescription("The total amount of XP to set")
        .setRequired(true)
        .setMinValue(0)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser("user");
    const newXp = interaction.options.getInteger("xp");
    const db = interaction.client.db;

    // Calculate the new level based on the provided XP
    const newLevel = calculateLevel(newXp);

    const userRef = db
      .collection("guilds")
      .doc(interaction.guild.id)
      .collection("levels")
      .doc(targetUser.id);

    await userRef.set(
      {
        xp: newXp,
        level: newLevel,
      },
      { merge: true }
    );

    const embed = new EmbedBuilder()
      .setColor("Green")
      .setTitle("User XP Updated")
      .setDescription(`Successfully updated **${targetUser.tag}**'s stats.`)
      .addFields(
        { name: "New Level", value: newLevel.toString(), inline: true },
        { name: "New Total XP", value: newXp.toString(), inline: true }
      );

    await interaction.editReply({ embeds: [embed] });
  },
};
