const {
  Events,
  ChannelType,
  PermissionsBitField,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState) {
    const { client, guild } = newState;
    const db = client.db;

    // --- Fetch Configuration ---
    const configRef = db
      .collection("guilds")
      .doc(guild.id)
      .collection("config")
      .doc("tempVC");
    const configDoc = await configRef.get();
    if (!configDoc.exists || !configDoc.data().enabled) return;

    const config = configDoc.data();
    const { hubChannelId, controlChannelId } = config;

    // --- Channel Creation Logic ---
    if (newState.channelId === hubChannelId) {
      try {
        const member = newState.member;
        const hubChannel = await guild.channels.fetch(hubChannelId);

        // Create the temporary channel
        const tempChannel = await guild.channels.create({
          name: `${member.displayName}'s Channel`,
          type: ChannelType.GuildVoice,
          parent: hubChannel.parentId,
          permissionOverwrites: [
            {
              id: member.id,
              allow: [PermissionsBitField.Flags.ManageChannels], // Gives the user full control
            },
          ],
        });

        // Move the user to their new channel
        await member.voice.setChannel(tempChannel);

        // --- Create the Control Panel ---
        const controlChannel = await guild.channels.fetch(controlChannelId);
        if (controlChannel) {
          const controlEmbed = new EmbedBuilder()
            .setColor("Aqua")
            .setAuthor({
              name: `VC Controls for ${member.displayName}`,
              iconURL: member.displayAvatarURL(),
            })
            .setDescription(
              `You are the owner of this temporary channel. Use the buttons below to manage it.`
            );

          const controlRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`vccontrol_lock_${tempChannel.id}`)
              .setLabel("Lock/Unlock")
              .setStyle(ButtonStyle.Secondary)
              .setEmoji("🔒"),
            new ButtonBuilder()
              .setCustomId(`vccontrol_rename_${tempChannel.id}`)
              .setLabel("Rename")
              .setStyle(ButtonStyle.Secondary)
              .setEmoji("✏️"),
            new ButtonBuilder()
              .setCustomId(`vccontrol_limit_${tempChannel.id}`)
              .setLabel("Set Limit")
              .setStyle(ButtonStyle.Secondary)
              .setEmoji("👥")
          );

          const controlMessage = await controlChannel.send({
            embeds: [controlEmbed],
            components: [controlRow],
          });

          // --- Save to Database ---
          const tempChannelRef = db
            .collection("guilds")
            .doc(guild.id)
            .collection("tempChannels")
            .doc(tempChannel.id);
          await tempChannelRef.set({
            ownerId: member.id,
            controlMessageId: controlMessage.id,
          });
        }
      } catch (error) {
        console.error("Error creating temporary VC:", error);
      }
    }

    // --- Channel Deletion Logic ---
    if (oldState.channelId && oldState.channelId !== hubChannelId) {
      const tempChannelRef = db
        .collection("guilds")
        .doc(guild.id)
        .collection("tempChannels")
        .doc(oldState.channelId);
      const tempChannelDoc = await tempChannelRef.get();

      // Check if the channel they left was a temporary one
      if (tempChannelDoc.exists) {
        const channel = oldState.channel;
        // If the channel is now empty, delete it
        if (channel.members.size === 0) {
          try {
            await channel.delete("Temporary channel is empty.");

            const controlChannel = await guild.channels.fetch(controlChannelId);
            if (controlChannel) {
              // Delete the control panel message
              const controlMessage = await controlChannel.messages.fetch(
                tempChannelDoc.data().controlMessageId
              );
              await controlMessage.delete();
            }

            // Delete the record from the database
            await tempChannelRef.delete();
          } catch (error) {
            console.error(
              "Error deleting temporary VC or its components:",
              error
            );
          }
        }
      }
    }
  },
};
