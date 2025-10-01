const { EmbedBuilder } = require("discord.js");

async function endGiveaway(client, giveawayDoc) {
  const db = giveawayDoc.ref.firestore;
  const giveawayData = giveawayDoc.data();

  try {
    const guild = await client.guilds.fetch(giveawayData.guildId);
    const channel = await guild.channels.fetch(giveawayData.channelId);
    const message = await channel.messages.fetch(giveawayDoc.id);

    const reaction = message.reactions.cache.get("🎉");
    let participants = [];
    if (reaction) {
      participants = await reaction.users.fetch();
    }

    const winners = participants
      .filter((user) => !user.bot)
      .random(giveawayData.winnerCount);

    await announceWinners(message, winners, giveawayData.prize);

    // Save winners to the database for rerolls
    await giveawayDoc.ref.update({
      ended: true,
      winners: winners.map((u) => u.id),
    });
  } catch (error) {
    console.error(`Error ending giveaway ${giveawayDoc.id}:`, error);
    await giveawayDoc.ref.update({ ended: true }); // Mark as ended to prevent re-processing
  }
}

async function announceWinners(message, winners, prize) {
  const winnerTags = winners.map((u) => u.toString()).join(", ");
  const announcement =
    winnerTags.length > 0
      ? `Congratulations ${winnerTags}! You won the **${prize}**!`
      : `The giveaway for the **${prize}** ended with no participants.`;

  await message.channel.send(announcement);

  const originalEmbed = EmbedBuilder.from(message.embeds[0])
    .setColor("DarkRed")
    .setTitle("🎉 Giveaway Ended! 🎉")
    .setDescription(
      `This giveaway has ended.\nWinners: ${
        winnerTags.length > 0 ? winnerTags : "None"
      }`
    );

  await message.edit({ embeds: [originalEmbed] });
}

module.exports = { endGiveaway };
