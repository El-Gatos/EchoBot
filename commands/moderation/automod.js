const {
  SlashCommandBuilder,
  PermissionsBitField,
  EmbedBuilder,
} = require("discord.js");
const { FieldValue } = require("firebase-admin/firestore");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("automod")
    .setDescription("Configures the custom automoderation system.")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
    .addSubcommandGroup((group) =>
      group
        .setName("words")
        .setDescription("Manages the banned word filter.")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("toggle")
            .setDescription("Enables or disables the word filter.")
            .addBooleanOption((option) =>
              option
                .setName("enabled")
                .setDescription("Set to true to enable, false to disable")
                .setRequired(true)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("add")
            .setDescription("Adds a word to the filter.")
            .addStringOption((option) =>
              option
                .setName("word")
                .setDescription(
                  "The word to ban (will be matched case-insensitively)"
                )
                .setRequired(true)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("remove")
            .setDescription("Removes a word from the filter.")
            .addStringOption((option) =>
              option
                .setName("word")
                .setDescription("The word to unban")
                .setRequired(true)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("list")
            .setDescription("Lists all currently banned words.")
        )
    )
    // --- NEW SUBCOMMAND GROUP FOR INVITE FILTERING ---
    .addSubcommandGroup((group) =>
      group
        .setName("invites")
        .setDescription("Manages the Discord invite link filter.")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("toggle")
            .setDescription("Enables or disables the invite filter.")
            .addBooleanOption((option) =>
              option
                .setName("enabled")
                .setDescription("Set to true to enable, false to disable")
                .setRequired(true)
            )
        )
    ),

  async execute(interaction) {
    const group = interaction.options.getSubcommandGroup();
    const subcommand = interaction.options.getSubcommand();
    const db = interaction.client.db;
    const configRef = db
      .collection("guilds")
      .doc(interaction.guild.id)
      .collection("config")
      .doc("automod");

    if (group === "words") {
      // (This part is unchanged)
      if (subcommand === "toggle") {
        const enabled = interaction.options.getBoolean("enabled");
        await configRef.set({ wordFilterEnabled: enabled }, { merge: true });
        return interaction.editReply(
          `✅ Word filter has been **${enabled ? "enabled" : "disabled"}**.`
        );
      }
      if (subcommand === "add") {
        const word = interaction.options.getString("word").toLowerCase();
        await configRef.set(
          { bannedWords: FieldValue.arrayUnion(word) },
          { merge: true }
        );
        return interaction.editReply(
          `✅ The word \`${word}\` has been added to the filter.`
        );
      }
      if (subcommand === "remove") {
        const word = interaction.options.getString("word").toLowerCase();
        await configRef.set(
          { bannedWords: FieldValue.arrayRemove(word) },
          { merge: true }
        );
        return interaction.editReply(
          `✅ The word \`${word}\` has been removed from the filter.`
        );
      }
      if (subcommand === "list") {
        const doc = await configRef.get();
        const words = doc.data()?.bannedWords || [];
        const embed = new EmbedBuilder()
          .setColor("Blue")
          .setTitle("Banned Word List")
          .setDescription(
            words.length > 0
              ? `\`${words.join("`, `")}\``
              : "There are no banned words."
          );
        return interaction.editReply({ embeds: [embed] });
      }
    }

    // --- NEW HANDLER FOR THE INVITES GROUP ---
    if (group === "invites") {
      if (subcommand === "toggle") {
        const enabled = interaction.options.getBoolean("enabled");
        await configRef.set({ inviteFilterEnabled: enabled }, { merge: true });
        return interaction.editReply(
          `✅ Discord invite filter has been **${
            enabled ? "enabled" : "disabled"
          }**.`
        );
      }
    }
  },
};
