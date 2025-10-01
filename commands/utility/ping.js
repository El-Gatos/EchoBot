const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with Pong! and shows latency."),
  async execute(interaction) {
    const apiLatency = Date.now() - interaction.createdTimestamp;

    const websocketPing = interaction.client.ws.ping;

    await interaction.editReply(
      `Pong! 🏓\n**API Latency:** ${apiLatency}ms\n**WebSocket Heartbeat:** ${websocketPing}ms`
    );
  },
};
