const {
  SlashCommandBuilder,
  PermissionsBitField,
  ChannelType,
  EmbedBuilder,
  InteractionContextType,
} = require("discord.js");
const ms = require("ms");
const { endGiveaway } = require("../../utils/giveawayManager"); // Import our new function

module.exports = {
  data: new SlashCommandBuilder()
    .setName("giveaway")
    .setDescription("Manages the giveaway system.")
    .setContexts(InteractionContextType.Guild)
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageGuild)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("start")
        .setDescription("Starts a new giveaway.")
        .addStringOption((option) =>
          option
            .setName("duration")
            .setDescription("Duration (e.g., 1d, 2h, 30m)")
            .setRequired(true)
        )
        .addIntegerOption((option) =>
          option
            .setName("winners")
            .setDescription("Number of winners")
            .setRequired(true)
            .setMinValue(1)
        )
        .addStringOption((option) =>
          option.setName("prize").setDescription("The prize").setRequired(true)
        )
        .addChannelOption((option) =>
          option
            .setName("channel")
            .setDescription("Channel to post in")
            .addChannelTypes(ChannelType.GuildText)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("end")
        .setDescription("Ends a giveaway early.")
        .addStringOption((option) =>
          option
            .setName("message_id")
            .setDescription("The message ID of the giveaway")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("reroll")
        .setDescription("Rerolls a winner for an ended giveaway.")
        .addStringOption((option) =>
          option
            .setName("message_id")
            .setDescription("The message ID of the giveaway")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("edit")
        .setDescription("Edits an active giveaway.")
        .addStringOption((option) =>
          option
            .setName("message_id")
            .setDescription("The message ID of the giveaway")
            .setRequired(true)
        )
        .addIntegerOption((option) =>
          option
            .setName("winners")
            .setDescription("The new number of winners")
            .setMinValue(1)
        )
        .addStringOption((option) =>
          option.setName("prize").setDescription("The new prize")
        )
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const db = interaction.client.db;

    if (subcommand === "start") {
      const durationString = interaction.options.getString("duration");
      const winnerCount = interaction.options.getInteger("winners");
      const prize = interaction.options.getString("prize");
      const channel =
        interaction.options.getChannel("channel") || interaction.channel;

      const durationMs = ms(durationString);
      if (!durationMs || durationMs < 10000) {
        return interaction.editReply(
          "Please provide a valid duration (e.g., 1d, 2h, 30m)."
        );
      }

      const endTime = Date.now() + durationMs;

      const embed = new EmbedBuilder()
        .setColor("Gold")
        .setTitle("🎉 Giveaway Started! 🎉")
        .setDescription(
          `React with 🎉 to enter!\nEnds: <t:${Math.round(endTime / 1000)}:R>`
        )
        .addFields(
          { name: "Prize", value: prize },
          { name: "Winners", value: winnerCount.toString() }
        )
        .setTimestamp();

      try {
        const giveawayMessage = await channel.send({ embeds: [embed] });
        await giveawayMessage.react("🎉");

        await db
          .collection("guilds")
          .doc(interaction.guild.id)
          .collection("giveaways")
          .doc(giveawayMessage.id)
          .set({
            prize: prize,
            endTime: new Date(endTime),
            winnerCount: winnerCount,
            channelId: channel.id,
            guildId: interaction.guild.id,
            ended: false,
            winners: [],
          });

        await interaction.editReply(
          "✅ Giveaway has been started successfully!"
        );
      } catch (error) {
        await interaction.editReply(
          "I do not have permissions to send messages or add reactions in that channel."
        );
      }
    } else {
      // --- Logic for End, Reroll, Edit ---
      const messageId = interaction.options.getString("message_id");
      const giveawayRef = db
        .collection("guilds")
        .doc(interaction.guild.id)
        .collection("giveaways")
        .doc(messageId);
      const giveawayDoc = await giveawayRef.get();

      if (!giveawayDoc.exists) {
        return interaction.editReply(
          "Could not find a giveaway with that message ID."
        );
      }

      if (subcommand === "end") {
        if (giveawayDoc.data().ended) {
          return interaction.editReply("This giveaway has already ended.");
        }
        await endGiveaway(interaction.client, giveawayDoc);
        await interaction.editReply("✅ Giveaway has been ended successfully.");
      } else if (subcommand === "reroll") {
        if (!giveawayDoc.data().ended) {
          return interaction.editReply("This giveaway has not ended yet.");
        }

        try {
          const giveawayData = giveawayDoc.data();
          const channel = await interaction.guild.channels.fetch(
            giveawayData.channelId
          );
          const message = await channel.messages.fetch(giveawayDoc.id);

          const reaction = message.reactions.cache.get("🎉");
          const participants = await reaction.users.fetch();
          const validParticipants = participants.filter(
            (user) => !user.bot && !giveawayData.winners.includes(user.id)
          );

          if (validParticipants.size < 1) {
            return interaction.editReply(
              "There are no other valid participants to reroll."
            );
          }

          const newWinner = validParticipants.random();
          await channel.send(
            `🎉 **Reroll!** Congratulations ${newWinner}, you won the **${giveawayData.prize}**!`
          );
          await giveawayRef.update({
            winners: [...giveawayData.winners, newWinner.id],
          });
          await interaction.editReply("✅ Reroll complete!");
        } catch (error) {
          await interaction.editReply(
            "An error occurred. Make sure the original giveaway message still exists."
          );
        }
      } else if (subcommand === "edit") {
        if (giveawayDoc.data().ended) {
          return interaction.editReply(
            "Cannot edit a giveaway that has already ended."
          );
        }

        const newWinnerCount = interaction.options.getInteger("winners");
        const newPrize = interaction.options.getString("prize");
        let updates = {};
        if (newWinnerCount) updates.winnerCount = newWinnerCount;
        if (newPrize) updates.prize = newPrize;

        if (Object.keys(updates).length === 0) {
          return interaction.editReply(
            "You must provide a new winner count or a new prize."
          );
        }

        await giveawayRef.update(updates);

        try {
          const giveawayData = { ...giveawayDoc.data(), ...updates };
          const channel = await interaction.guild.channels.fetch(
            giveawayData.channelId
          );
          const message = await channel.messages.fetch(giveawayDoc.id);

          const newEmbed = EmbedBuilder.from(message.embeds[0]).setFields(
            { name: "Prize", value: giveawayData.prize },
            { name: "Winners", value: giveawayData.winnerCount.toString() }
          );
          await message.edit({ embeds: [newEmbed] });
          await interaction.editReply(
            "✅ Giveaway has been updated successfully."
          );
        } catch (error) {
          await interaction.editReply(
            "An error occurred. Could not update the giveaway message."
          );
        }
      }
    }
  },
};
