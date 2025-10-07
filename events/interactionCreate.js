const {
  Events,
  MessageFlags,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  PermissionsBitField,
  ChannelType,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

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
    const db = interaction.client.db;
    const guild = interaction.guild;

    // 1. --- Slash Command Handling ---
    if (interaction.isChatInputCommand()) {
      if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands.get(
          interaction.commandName
        );

        if (!command) {
          console.error(
            `No command matching ${interaction.commandName} was found.`
          );
          return;
        }

        try {
          // Check for the new isPublic property
          if (command.isPublic) {
            await interaction.deferReply(); // Defer publicly
          } else {
            await interaction.deferReply({ flags: MessageFlags.Ephemeral }); // Defer ephemerally (default)
          }

          await command.execute(interaction);
        } catch (error) {
          console.error(`Error executing ${interaction.commandName}`);
          console.error(error);

          if (interaction.deferred || interaction.replied) {
            await interaction.editReply({
              content: "There was an error while executing this command!",
            });
          }
        }
      }
    }
    // 2. --- Button Handling ---
    else if (interaction.isButton()) {
      // --- Role Menu Button Logic ---

      if (interaction.customId.startsWith("rolemenu_")) {
        try {
          await interaction.deferReply({ flags: MessageFlags.Ephemeral });
          const roleId = interaction.customId.split("_")[1];
          const role = await interaction.guild.roles.fetch(roleId);
          if (!role) {
            return interaction.editReply({
              content:
                "The role associated with this button could not be found.",
            });
          }

          if (interaction.member.roles.cache.has(role.id)) {
            await interaction.member.roles.remove(role);
            await interaction.editReply({
              content: `The **${role.name}** role has been removed.`,
            });
          } else {
            await interaction.member.roles.add(role);
            await interaction.editReply({
              content: `You have been given the **${role.name}** role.`,
            });
          }
        } catch (error) {
          console.error("Error handling role menu button:", error);
        }
      }

      if (interaction.customId.startsWith("vccontrol_")) {
        const [_, action, channelId] = interaction.customId.split("_");

        const tempChannelRef = db
          .collection("guilds")
          .doc(guild.id)
          .collection("tempChannels")
          .doc(channelId);
        const tempChannelDoc = await tempChannelRef.get();

        if (
          !tempChannelDoc.exists ||
          tempChannelDoc.data().ownerId !== interaction.user.id
        ) {
          return interaction.reply({
            content: "You are not the owner of this temporary channel.",
            flags: MessageFlags.Ephemeral,
          });
        }

        const channel = await guild.channels.fetch(channelId).catch(() => null);
        if (!channel) {
          return interaction.reply({
            content: "This temporary channel no longer exists.",
            flags: MessageFlags.Ephemeral,
          });
        }

        switch (action) {
          case "lock": {
            const isLocked = channel.permissionOverwrites.cache.has(
              guild.roles.everyone.id
            );
            await channel.permissionOverwrites.edit(guild.roles.everyone, {
              Connect: isLocked ? null : false,
            });
            await interaction.reply({
              content: `Channel has been **${
                isLocked ? "unlocked" : "locked"
              }**.`,
              flags: MessageFlags.Ephemeral,
            });
            break;
          }
          case "rename": {
            const modal = new ModalBuilder()
              .setCustomId(`vcmodal_rename_${channelId}`)
              .setTitle("Rename Your Channel")
              .addComponents(
                new ActionRowBuilder().addComponents(
                  new TextInputBuilder()
                    .setCustomId("name")
                    .setLabel("New Channel Name")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                )
              );
            await interaction.showModal(modal);
            break;
          }
          case "limit": {
            const modal = new ModalBuilder()
              .setCustomId(`vcmodal_limit_${channelId}`)
              .setTitle("Set User Limit")
              .addComponents(
                new ActionRowBuilder().addComponents(
                  new TextInputBuilder()
                    .setCustomId("limit")
                    .setLabel("User Limit (0 for unlimited)")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                )
              );
            await interaction.showModal(modal);
            break;
          }
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
      // --- Ticket Creation Button ---
      else if (interaction.customId === "ticket_create") {
        const ticketModal = new ModalBuilder()
          .setCustomId("ticket_modal")
          .setTitle("Create a Support Ticket");

        const subjectInput = new TextInputBuilder()
          .setCustomId("ticket_subject")
          .setLabel("What is the subject of your ticket?")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("e.g., Report a User, Question about leveling")
          .setRequired(true);

        const descriptionInput = new TextInputBuilder()
          .setCustomId("ticket_description")
          .setLabel("Please describe your issue in detail.")
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        const firstActionRow = new ActionRowBuilder().addComponents(
          subjectInput
        );
        const secondActionRow = new ActionRowBuilder().addComponents(
          descriptionInput
        );

        ticketModal.addComponents(firstActionRow, secondActionRow);
        await interaction.showModal(ticketModal);
      }

      // --- Ticket Claiming Button ---
      else if (interaction.customId === "ticket_claim") {
        if (
          !interaction.member.permissions.has(
            PermissionsBitField.Flags.ModerateMembers
          )
        ) {
          return interaction.reply({
            content: "Only support staff can claim tickets.",
            flags: MessageFlags.Ephemeral,
          });
        }
        await interaction.deferUpdate();

        const originalEmbed = EmbedBuilder.from(interaction.message.embeds[0])
          .setColor("Yellow")
          .addFields({ name: "Claimed by", value: `${interaction.user}` });

        const disabledButtons = ActionRowBuilder.from(
          interaction.message.components[0]
        ).setComponents(
          new ButtonBuilder()
            .setCustomId("ticket_claim")
            .setLabel("Claimed")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(true),
          ButtonBuilder.from(interaction.message.components[0].components[1])
        );

        await interaction.message.edit({
          embeds: [originalEmbed],
          components: [disabledButtons],
        });
      }

      // --- Ticket Close Button ---
      else if (interaction.customId === "ticket_close") {
        if (
          !interaction.member.permissions.has(
            PermissionsBitField.Flags.Administrator
          )
        ) {
          return interaction.reply({
            content: "You must be an administrator to close this ticket.",
            flags: MessageFlags.Ephemeral,
          });
        }
        const confirmEmbed = new EmbedBuilder()
          .setColor("Red")
          .setDescription("Are you sure you want to close this ticket?");
        const confirmButtons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("ticket_close_confirm")
            .setLabel("Yes, close it")
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId("ticket_close_cancel")
            .setLabel("Cancel")
            .setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({
          embeds: [confirmEmbed],
          components: [confirmButtons],
          flags: MessageFlags.Ephemeral,
        });
      }

      // --- Ticket Close Confirmation Button ---
      else if (interaction.customId === "ticket_close_confirm") {
        if (
          !interaction.member.permissions.has(
            PermissionsBitField.Flags.Administrator
          )
        ) {
          return;
        }
        await interaction.update({
          content: "Closing ticket in 5 seconds...",
          components: [],
          embeds: [],
        });
        setTimeout(
          () => interaction.channel.delete("Ticket closed by user."),
          5000
        );
      }
      // --- Handle Close Cancellation ---
      else if (interaction.customId === "ticket_close_cancel") {
        await interaction.message.delete();
      }

      // --- XP Reset Confirmation Button Logic ---
      else if (interaction.customId.startsWith("xpreset_")) {
        if (
          !interaction.member.permissions.has(
            PermissionsBitField.Flags.Administrator
          )
        ) {
          return interaction.reply({
            content: "Only an administrator can confirm this action.",
            flags: MessageFlags.Ephemeral,
          });
        }

        const action = interaction.customId.split("_")[1];

        const disabledRow = ActionRowBuilder.from(
          interaction.message.components[0]
        ).setComponents(
          interaction.message.components[0].components.map((c) =>
            ButtonBuilder.from(c).setDisabled(true)
          )
        );

        if (action === "cancel") {
          // Acknowledge the interaction and edit the original message in one step.
          return interaction.update({
            content: "XP reset has been cancelled.",
            embeds: [],
            components: [disabledRow],
          });
        }

        if (action === "confirm") {
          // Acknowledge the interaction and update the message to show work is in progress.
          await interaction.update({
            content: "Resetting all user XP... This may take a moment.",
            embeds: [],
            components: [disabledRow],
          });

          const db = interaction.client.db;
          const levelsRef = db
            .collection("guilds")
            .doc(interaction.guild.id)
            .collection("levels");

          try {
            const snapshot = await levelsRef.get();
            if (snapshot.empty) {
              // Use followUp because already replied with update()
              return interaction.followUp({
                content: "There was no XP data to reset.",
                flags: MessageFlags.Ephemeral,
              });
            }

            const batch = db.batch();
            snapshot.docs.forEach((doc) => {
              batch.delete(doc.ref);
            });
            await batch.commit();

            await interaction.followUp({
              content:
                "✅ All XP and levels for this server have been successfully reset.",
              flags: MessageFlags.Ephemeral,
            });
          } catch (error) {
            console.error("Error resetting XP:", error);
            await interaction.followUp({
              content: "An error occurred while trying to reset the data.",
              flags: MessageFlags.Ephemeral,
            });
          }
        }
      }
    }
    // 3. --- Modal Submission Handling (NEW TOP-LEVEL BLOCK) ---
    else if (interaction.isModalSubmit()) {
      if (interaction.customId === "ticket_modal") {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        const subject = interaction.fields.getTextInputValue("ticket_subject");
        const description =
          interaction.fields.getTextInputValue("ticket_description");

        const configRef = db
          .collection("guilds")
          .doc(interaction.guild.id)
          .collection("config")
          .doc("tickets");
        const configDoc = await configRef.get();
        if (!configDoc.exists) {
          return interaction.editReply(
            "The ticket system has not been configured."
          );
        }

        const { categoryId, supportRoleId } = configDoc.data();
        const category = await interaction.guild.channels.fetch(categoryId);
        const supportRole = await interaction.guild.roles.fetch(supportRoleId);

        const ticketChannel = await interaction.guild.channels.create({
          name: `ticket-${subject.slice(0, 20)}`,
          type: ChannelType.GuildText,
          parent: category,
          permissionOverwrites: [
            {
              id: interaction.guild.roles.everyone,
              deny: [PermissionsBitField.Flags.ViewChannel],
            },
            {
              id: interaction.user.id,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
              ],
            },
            {
              id: supportRole.id,
              allow: [
                PermissionsBitField.Flags.ViewChannel,
                PermissionsBitField.Flags.SendMessages,
              ],
            },
          ],
        });

        await interaction.editReply(
          `✅ Your ticket has been created: ${ticketChannel}`
        );

        const ticketEmbed = new EmbedBuilder()
          .setColor("Green")
          .setAuthor({
            name: interaction.user.tag,
            iconURL: interaction.user.displayAvatarURL(),
          })
          .setTitle(subject)
          .setDescription(description)
          .setTimestamp();
        const ticketControls = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("ticket_claim")
            .setLabel("Claim Ticket")
            .setStyle(ButtonStyle.Primary)
            .setEmoji("🙋"),
          new ButtonBuilder()
            .setCustomId("ticket_close")
            .setLabel("Close Ticket")
            .setStyle(ButtonStyle.Danger)
            .setEmoji("🔒")
        );
        await ticketChannel.send({
          content: `${interaction.user} ${supportRole}`,
          embeds: [ticketEmbed],
          components: [ticketControls],
        });
      }
      if (interaction.customId.startsWith("vcmodal_")) {
        const [_, action, channelId] = interaction.customId.split("_");

        const tempChannelRef = db
          .collection("guilds")
          .doc(guild.id)
          .collection("tempChannels")
          .doc(channelId);
        const tempChannelDoc = await tempChannelRef.get();

        if (
          !tempChannelDoc.exists ||
          tempChannelDoc.data().ownerId !== interaction.user.id
        ) {
          return interaction.reply({
            content: "You do not have permission to modify this channel.",
            flags: MessageFlags.Ephemeral,
          });
        }

        const channel = await guild.channels.fetch(channelId).catch(() => null);
        if (!channel) {
          return interaction.reply({
            content: "This channel no longer exists.",
            flags: MessageFlags.Ephemeral,
          });
        }

        if (action === "rename") {
          const newName = interaction.fields.getTextInputValue("name");
          await channel.setName(newName);
          await interaction.reply({
            content: `Channel has been renamed to **${newName}**.`,
            flags: MessageFlags.Ephemeral,
          });
        }

        if (action === "limit") {
          const newLimit = parseInt(
            interaction.fields.getTextInputValue("limit")
          );
          if (isNaN(newLimit) || newLimit < 0 || newLimit > 99) {
            return interaction.reply({
              content: "Please enter a valid number between 0 and 99.",
              flags: MessageFlags.Ephemeral,
            });
          }
          await channel.setUserLimit(newLimit);
          await interaction.reply({
            content: `Channel user limit set to **${
              newLimit === 0 ? "Unlimited" : newLimit
            }**.`,
            flags: MessageFlags.Ephemeral,
          });
        }
      }
    }
  },
};
