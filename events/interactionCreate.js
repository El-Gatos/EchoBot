const { Events, MessageFlags, EmbedBuilder } = require("discord.js");

// RPS game logic - needed for determining the winner
const wins = {
  Rock: ["Scissors", "Sponge", "Fire"],
  Paper: ["Rock", "Air", "Water"],
  Scissors: ["Paper", "Sponge", "Air"],
  Fire: ["Paper", "Scissors", "Sponge"],
  Sponge: ["Paper", "Water", "Rock"],
  Water: ["Rock", "Fire", "Scissors"],
  Air: ["Fire", "Rock", "Water"],
};

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    // --- Slash Command Handling ---
    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);

      if (!command) {
        console.error(
          `No command matching ${interaction.commandName} was found.`
        );
        return;
      }

      try {
        // Defer the reply for all slash commands
        if (!interaction.deferred) {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        }

        await command.execute(interaction);
      } catch (error) {
        console.error(`Error executing ${interaction.commandName}`);
        console.error(error);

        await interaction.editReply({
          content: "There was an error while executing this command!",
        });
      }
    }

    // --- Button Handling ---
    else if (interaction.isButton()) {
      // --- Role Menu Button Logic ---
      if (interaction.customId.startsWith("rolemenu_")) {
        try {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });

          const roleId = interaction.customId.split("_")[1];
          const role = await interaction.guild.roles.fetch(roleId);
          const member = interaction.member;

          if (!role) {
            return interaction.editReply({
              content:
                "The role associated with this button could not be found.",
            });
          }

          if (member.roles.cache.has(role.id)) {
            await member.roles.remove(role);
            await interaction.editReply({
              content: `The **${role.name}** role has been removed.`,
            });
          } else {
            await member.roles.add(role);
            await interaction.editReply({
              content: `You have been given the **${role.name}** role.`,
            });
          }
        } catch (error) {
          console.error("Error handling role menu button:", error);
        }
      }

      // --- RPS Game Move Button Logic ---
      else if (interaction.customId.startsWith("rps-move_")) {
        const [_, gameId, move] = interaction.customId.split("_");
        const game = interaction.client.activeGames.get(gameId);

        if (!game || game.moves[interaction.user.id]) {
          return interaction.update({
            content: "You have already made your move or this game is invalid.",
            components: [],
          });
        }

        game.moves[interaction.user.id] = move;
        await interaction.update({
          content: `You have chosen **${move}**! Waiting for your opponent...`,
          components: [],
        });

        if (Object.keys(game.moves).length === 2) {
          const [player1Id, player2Id] = game.players;
          const move1 = game.moves[player1Id];
          const move2 = game.moves[player2Id];

          const player1 = await interaction.client.users.fetch(player1Id);
          const player2 = await interaction.client.users.fetch(player2Id);

          let resultText;
          if (move1 === move2) {
            resultText = "It's a tie!";
          } else if (wins[move1].includes(move2)) {
            resultText = `${player1} wins!`;
          } else {
            resultText = `${player2} wins!`;
          }

          const resultEmbed = new EmbedBuilder()
            .setColor("Purple")
            .setTitle("Duel Result")
            .setDescription(resultText)
            .addFields(
              { name: player1.username, value: move1, inline: true },
              { name: player2.username, value: move2, inline: true }
            );

          const channel = await interaction.client.channels.fetch(
            game.channelId
          );
          if (channel) {
            await channel.send({ embeds: [resultEmbed] });
          }
          interaction.client.activeGames.delete(gameId);
        }
      }
    }

    // --- XP Reset Confirmation Button Logic ---
    else if (interaction.customId.startsWith("xpreset_")) {
      const action = interaction.customId.split("_")[1];

      if (action === "cancel") {
        // For a quick action like cancel, we can acknowledge and edit in one step.
        const disabledRow = ActionRowBuilder.from(
          interaction.message.components[0]
        ).setComponents(
          interaction.message.components[0].components.map((c) =>
            ButtonBuilder.from(c).setDisabled(true)
          )
        );
        return interaction.update({
          content: "XP reset has been cancelled.",
          embeds: [],
          components: [disabledRow],
        });
      }

      // For the slow 'confirm' action, we must defer first.
      if (action === "confirm") {
        await interaction.deferReply({ ephemeral: true });

        // Now that we have acknowledged, we can safely perform other actions.
        if (
          !interaction.member.permissions.has(
            PermissionsBitField.Flags.Administrator
          )
        ) {
          return interaction.editReply({
            content: "Only an administrator can confirm this action.",
          });
        }

        const disabledRow = ActionRowBuilder.from(
          interaction.message.components[0]
        ).setComponents(
          interaction.message.components[0].components.map((c) =>
            ButtonBuilder.from(c).setDisabled(true)
          )
        );
        await interaction.message.edit({ components: [disabledRow] });

        const db = interaction.client.db;
        const levelsRef = db
          .collection("guilds")
          .doc(interaction.guild.id)
          .collection("levels");

        try {
          const snapshot = await levelsRef.get();
          if (snapshot.empty) {
            return interaction.editReply({
              content: "There was no XP data to reset.",
            });
          }

          const batch = db.batch();
          snapshot.docs.forEach((doc) => {
            batch.delete(doc.ref);
          });
          await batch.commit();

          await interaction.editReply({
            content:
              "✅ All XP and levels for this server have been successfully reset.",
          });
        } catch (error) {
          console.error("Error resetting XP:", error);
          await interaction.editReply({
            content: "An error occurred while trying to reset the data.",
          });
        }
      }
    }
  },
};
