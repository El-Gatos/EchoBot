const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  InteractionContextType,
  PermissionsBitField,
} = require("discord.js");

// --- Game Logic ---
const choices = ["Rock", "Paper", "Scissors", "Fire", "Sponge", "Water", "Air"];
const wins = {
  Rock: ["Scissors", "Sponge", "Fire"],
  Paper: ["Rock", "Air", "Water"],
  Scissors: ["Paper", "Sponge", "Air"],
  Fire: ["Paper", "Scissors", "Sponge"],
  Sponge: ["Paper", "Water", "Rock"],
  Water: ["Rock", "Fire", "Scissors"],
  Air: ["Fire", "Rock", "Water"],
};

// --- Main Command ---
module.exports = {
  data: new SlashCommandBuilder()
    .setName("rps")
    .setDescription("Play a game of crazy Rock, Paper, Scissors.")
    .setContexts(InteractionContextType.Guild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("play")
        .setDescription("Play against the bot.")
        .addStringOption((option) =>
          option
            .setName("choice")
            .setDescription("Your choice")
            .setRequired(true)
            .addChoices(
              ...choices.map((choice) => ({ name: choice, value: choice }))
            )
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("challenge")
        .setDescription("Challenge another user to a duel.")
        .addUserOption((option) =>
          option
            .setName("opponent")
            .setDescription("The user you want to challenge")
            .setRequired(true)
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "play") {
      // --- Player vs. Bot Logic ---
      const userChoice = interaction.options.getString("choice");
      const botChoice = choices[Math.floor(Math.random() * choices.length)];

      let resultText;
      if (userChoice === botChoice) {
        resultText = "It's a tie!";
      } else if (wins[userChoice].includes(botChoice)) {
        resultText = `${interaction.user} wins!`;
      } else {
        resultText = `The bot wins!`;
      }

      const embed = new EmbedBuilder()
        .setColor("Aqua")
        .setTitle("Rock, Paper, Scissors... CRAZY!")
        .setDescription(resultText)
        .addFields(
          { name: interaction.user.username, value: userChoice, inline: true },
          { name: "Bot", value: botChoice, inline: true }
        );

      await interaction.editReply({ embeds: [embed] });
    } else if (subcommand === "challenge") {
      // --- Player vs. Player Logic ---
      const opponent = interaction.options.getUser("opponent");
      const challenger = interaction.user;

      if (opponent.bot) {
        return interaction.editReply({
          content: "You cannot challenge a bot.",
        });
      }
      if (opponent.id === challenger.id) {
        return interaction.editReply({
          content: "You cannot challenge yourself.",
        });
      }

      const gameId = interaction.id;
      interaction.client.activeGames.set(gameId, {
        players: [challenger.id, opponent.id],
        moves: {},
        channelId: interaction.channel.id,
      });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`rps-accept_${gameId}`)
          .setLabel("Accept")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId(`rps-decline_${gameId}`)
          .setLabel("Decline")
          .setStyle(ButtonStyle.Danger)
      );

      const challengeEmbed = new EmbedBuilder()
        .setColor("Gold")
        .setTitle("⚔️ A Duel is afoot! ⚔️")
        .setDescription(
          `${opponent}, you have been challenged to a game of Crazy RPS by ${challenger}!`
        );

      const challengeMessage = await interaction.channel.send({
        content: `${opponent}`,
        embeds: [challengeEmbed],
        components: [row],
      });

      await interaction.editReply({ content: "Your challenge has been sent!" });

      // --- Challenge Collector ---
      const collector = challengeMessage.createMessageComponentCollector({
        filter: (i) => i.user.id === opponent.id,
        time: 15000, // 15 seconds
      });

      collector.on("collect", async (i) => {
        if (i.customId.startsWith("rps-accept")) {
          await i.deferUpdate();
          collector.stop("accepted");
        } else if (i.customId.startsWith("rps-decline")) {
          await i.deferUpdate();
          collector.stop("declined");
        }
      });

      collector.on("end", async (collected, reason) => {
        // Disable buttons on the original message
        const disabledRow = ActionRowBuilder.from(row).setComponents(
          row.components.map((c) => ButtonBuilder.from(c).setDisabled(true))
        );

        if (reason === "accepted") {
          await challengeMessage.edit({
            content: " ",
            embeds: [
              new EmbedBuilder()
                .setColor("Green")
                .setTitle("Challenge Accepted!")
                .setDescription(
                  "Both players, check your DMs to make your move!"
                ),
            ],
            components: [disabledRow],
          });
          promptPlayers(interaction.client, gameId);
        } else {
          let endReason = "The challenge was declined.";
          if (reason === "time") {
            endReason = "The challenge expired after 15 seconds.";
          }
          await challengeMessage.edit({
            content: " ",
            embeds: [
              new EmbedBuilder()
                .setColor("Red")
                .setTitle("Challenge Over")
                .setDescription(endReason),
            ],
            components: [disabledRow],
          });
          interaction.client.activeGames.delete(gameId);
        }
      });
    }
  },
};

// --- Helper Functions for PvP ---
async function promptPlayers(client, gameId) {
  const game = activeGames.get(gameId);
  if (!game) return;

  const moveRow = new ActionRowBuilder();
  choices.forEach((choice) => {
    moveRow.addComponents(
      new ButtonBuilder()
        .setCustomId(`rps-move_${gameId}_${choice}`)
        .setLabel(choice)
        .setStyle(ButtonStyle.Secondary)
    );
  });

  for (const playerId of game.players) {
    try {
      const user = await client.users.fetch(playerId);
      const dmChannel = await user.createDM();
      await dmChannel.send({
        content: "Make your move!",
        components: [moveRow],
      });
    } catch (error) {
      console.log(`Could not DM user ${playerId}`);
    }
  }
}
