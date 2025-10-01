const {
  SlashCommandBuilder,
  PermissionsBitField,
  EmbedBuilder,
  ChannelType,
  MessageFlags,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("lock")
    .setDescription(
      "Locks a channel, preventing members from sending messages."
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("The channel to lock (defaults to current channel)")
        .addChannelTypes(ChannelType.GuildText)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("The reason for locking the channel")
    )
    .setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels),

  async execute(interaction) {
    const channel =
      interaction.options.getChannel("channel") || interaction.channel;
    const reason =
      interaction.options.getString("reason") || "No reason provided";

    // Check if the channel is already locked
    const everyoneRole = interaction.guild.roles.everyone;
    const perms = channel.permissionsFor(everyoneRole);
    if (!perms.has(PermissionsBitField.Flags.SendMessages)) {
      return interaction.editReply({
        content: `${channel} is already locked.`,
      });
    }

    try {
      // Update permissions for the @everyone role
      await channel.permissionOverwrites.edit(
        everyoneRole,
        {
          SendMessages: false,
        },
        { reason: `Channel locked by ${interaction.user.tag}: ${reason}` }
      );

      const successEmbed = new EmbedBuilder()
        .setColor("Red")
        .setTitle("Channel Locked")
        .setDescription(`Successfully locked ${channel}.`);

      await interaction.editReply({ embeds: [successEmbed] });

      // Send a public message in the locked channel
      const lockedEmbed = new EmbedBuilder()
        .setColor("Red")
        .setTitle("🔒 Channel Locked")
        .setDescription(`This channel has been locked by a moderator.`)
        .addFields({ name: "Reason", value: reason })
        .setTimestamp();

      await channel.send({ embeds: [lockedEmbed] });
    } catch (error) {
      console.error(error);
      await interaction.editReply({
        content: "An error occurred while trying to lock this channel.",
      });
    }
  },
};
