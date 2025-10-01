const {
  SlashCommandBuilder,
  PermissionsBitField,
  EmbedBuilder,
  ChannelType,
  MessageFlags,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unlock")
    .setDescription("Unlocks a channel, allowing members to send messages.")
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("The channel to unlock (defaults to current channel)")
        .addChannelTypes(ChannelType.GuildText)
    )
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels),

  async execute(interaction) {
    const channel =
      interaction.options.getChannel("channel") || interaction.channel;

    // Check if the channel is already unlocked
    const everyoneRole = interaction.guild.roles.everyone;
    const perms = channel.permissionsFor(everyoneRole);
    if (perms.has(PermissionsBitField.Flags.SendMessages)) {
      return interaction.editReply({ content: `${channel} is not locked.` });
    }

    try {
      // Update permissions for the @everyone role
      await channel.permissionOverwrites.edit(everyoneRole, {
        SendMessages: null, // Setting to null reverts to default
      });

      const successEmbed = new EmbedBuilder()
        .setColor("Green")
        .setTitle("Channel Unlocked")
        .setDescription(`Successfully unlocked ${channel}.`);

      await interaction.editReply({ embeds: [successEmbed] });

      // Send a public message in the unlocked channel
      const unlockedEmbed = new EmbedBuilder()
        .setColor("Green")
        .setTitle("🔓 Channel Unlocked")
        .setDescription("This channel has been unlocked.")
        .setTimestamp();

      await channel.send({ embeds: [unlockedEmbed] });
    } catch (error) {
      console.error(error);
      await interaction.editReply({
        content: "An error occurred while trying to unlock this channel.",
      });
    }
  },
};
