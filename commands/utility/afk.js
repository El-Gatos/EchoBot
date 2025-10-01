const {
  SlashCommandBuilder,
  EmbedBuilder,
  InteractionContextType,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("afk")
    .setDescription("Sets your status to AFK.")
    .setContexts(InteractionContextType.Guild)
    .addStringOption((option) =>
      option.setName("status").setDescription("The reason you are AFK")
    ),

  async execute(interaction) {
    const status =
      interaction.options.getString("status") || "No status provided";
    const db = interaction.client.db;
    const afkRef = db
      .collection("guilds")
      .doc(interaction.guild.id)
      .collection("afkUsers")
      .doc(interaction.user.id);

    // --- Save AFK status to database ---
    await afkRef.set({
      status: status,
      timestamp: new Date(),
    });

    // --- Try to change nickname ---
    try {
      const member = interaction.member;
      if (member.manageable && !member.displayName.startsWith("[AFK]")) {
        const oldNickname = member.displayName;
        const newNickname = `[AFK] ${oldNickname}`.slice(0, 32); // Ensure nickname is not too long
        await member.setNickname(newNickname);
      }
    } catch (error) {
      console.log(
        `Could not set nickname for ${interaction.user.tag} in ${interaction.guild.name}.`
      );
    }

    const embed = new EmbedBuilder()
      .setColor("Blue")
      .setTitle("You are now AFK")
      .setDescription(`Your status has been set to: **${status}**`)
      .setFooter({
        text: "Anyone who pings you will be notified. Send a message to remove your AFK status.",
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
