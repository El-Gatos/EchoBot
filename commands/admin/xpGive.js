const {
  SlashCommandBuilder,
  PermissionsBitField,
  EmbedBuilder,
  InteractionContextType,
} = require("discord.js");
const { getXpForLevel } = require("../../utils/levelingUtil.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("xpgive")
    .setDescription("Gives a user a specified amount of XP.")
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("The user to give XP to")
        .setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("The amount of XP to give")
        .setRequired(true)
        .setMinValue(1)
    ),

  async execute(interaction) {
    const targetUser = interaction.options.getUser("user");
    const amount = interaction.options.getInteger("amount");
    const db = interaction.client.db;

    const userRef = db
      .collection("guilds")
      .doc(interaction.guild.id)
      .collection("levels")
      .doc(targetUser.id);
    const userDoc = await userRef.get();

    const userData = userDoc.data() || { xp: 0, level: 0 };
    const originalLevel = userData.level;

    const newXp = userData.xp + amount;
    let newLevel = originalLevel;

    // --- Level-Up Check ---
    // Keep leveling up until the user's XP is no longer enough for the next level
    while (newXp >= getXpForLevel(newLevel + 1)) {
      newLevel++;
    }

    await userRef.set(
      {
        xp: newXp,
        level: newLevel,
      },
      { merge: true }
    );

    const embed = new EmbedBuilder()
      .setColor("Green")
      .setTitle("User XP Awarded")
      .setDescription(
        `Successfully gave **${amount} XP** to **${targetUser.tag}**.`
      )
      .addFields(
        { name: "New Level", value: newLevel.toString(), inline: true },
        { name: "New Total XP", value: newXp.toString(), inline: true }
      );

    if (newLevel > originalLevel) {
      embed.addFields({
        name: "Level Up!",
        value: `Level ${originalLevel}  ->  Level ${newLevel}`,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
