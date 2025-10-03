const { Events, EmbedBuilder } = require("discord.js");
const { antiRaid } = require("../config.json");
const recentJoins = new Map();
const lockdownActive = new Set();

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(member) {
    // New function for welcome logic
    async function handleWelcome(member) {
      const db = member.client.db;
      const configRef = db
        .collection("guilds")
        .doc(member.guild.id)
        .collection("config")
        .doc("welcome");

      try {
        const doc = await configRef.get();
        if (!doc.exists) return;

        const config = doc.data();
        if (!config.enabled || !config.channelId || !config.message) {
          return; // System is not fully configured
        }

        const welcomeChannel = await member.guild.channels.fetch(
          config.channelId
        );
        if (!welcomeChannel) return;

        // Replace placeholders
        const welcomeMessage = config.message
          .replace("{user}", member)
          .replace("{username}", member.user.username)
          .replace("{server}", member.guild.name);

        const welcomeEmbed = new EmbedBuilder()
          .setColor("Green")
          .setAuthor({
            name: member.user.tag,
            iconURL: member.user.displayAvatarURL(),
          })
          .setDescription(welcomeMessage)
          .setThumbnail(member.user.displayAvatarURL())
          .setTimestamp();

        await welcomeChannel.send({ embeds: [welcomeEmbed] });
      } catch (error) {
        console.error(
          `Failed to send welcome message for guild ${member.guild.id}:`,
          error
        );
      }
    }
    await handleWelcome(member);

    async function handleAutorole(member) {
      const db = member.client.db;
      const configRef = db
        .collection("guilds")
        .doc(member.guild.id)
        .collection("config")
        .doc("autorole");

      try {
        const doc = await configRef.get();
        if (!doc.exists) return;

        const config = doc.data();
        if (!config.enabled || !config.roleId) {
          return; // System is not enabled or no role is set
        }

        const role = await member.guild.roles.fetch(config.roleId);
        if (role) {
          await member.roles.add(role);
        }
      } catch (error) {
        console.error(
          `Failed to assign autorole for guild ${member.guild.id}:`,
          error
        );
      }
    }

    await handleAutorole(member);

    if (!antiRaid.enabled || member.guild.id !== antiRaid.guildId) return;

    const guildId = member.guild.id;
    const client = member.client;

    if (lockdownActive.has(guildId)) {
      // If lockdown is active, new members are kicked immediately.
      try {
        await member.kick("Automatic lockdown due to suspected raid.");
      } catch (error) {
        console.error(
          `[Anti-Raid] Failed to kick ${member.user.tag} during lockdown.`
        );
      }
      return;
    }

    const now = Date.now();
    // Get the list of recent joiners for this guild.
    // Each item in the list is now an object: { id: '...', timestamp: ... }
    const joinList = recentJoins.get(guildId) || [];

    // Filter out joins that are older than the configured time interval.
    const recent = joinList.filter(
      (join) => now - join.timestamp < antiRaid.timeInterval
    );

    // Add the new member to the list.
    recent.push({ id: member.id, timestamp: now });
    recentJoins.set(guildId, recent);

    // Check if the number of recent joins exceeds the threshold.
    if (recent.length >= antiRaid.joinThreshold) {
      lockdownActive.add(guildId);
      console.log(
        `[Anti-Raid] Raid detected in guild ${guildId}. Initiating lockdown.`
      );

      const logChannel = await client.channels.fetch(antiRaid.logChannelId);
      if (logChannel) {
        const embed = new EmbedBuilder()
          .setColor("Red")
          .setTitle("🚨 Raid Detected!")
          .setDescription(
            `Lockdown initiated due to rapid joins. **${
              recent.length
            }** users joined in the last ${
              antiRaid.timeInterval / 1000
            } seconds.`
          )
          .setTimestamp();
        await logChannel.send({ embeds: [embed] });
      }

      // Kick the suspicious members
      const membersToKickIds = recent.map((join) => join.id);

      for (const id of membersToKickIds) {
        try {
          const memberToKick = await member.guild.members.fetch(id);
          if (memberToKick) {
            await memberToKick.kick("Automatic raid detection.");
          }
        } catch (error) {
          console.error(`[Anti-Raid] Could not kick member ${id}:`, error);
        }
      }

      // Clear the recent joins list for this guild now that they've been kicked.
      recentJoins.set(guildId, []);

      // End the lockdown after a set time.
      setTimeout(() => {
        lockdownActive.delete(guildId);
        if (logChannel) {
          const embed = new EmbedBuilder()
            .setColor("Green")
            .setTitle("✅ Lockdown Lifted")
            .setDescription(
              "Server lockdown has ended. New members can join again."
            )
            .setTimestamp();
          logChannel.send({ embeds: [embed] });
        }
        console.log(`[Anti-Raid] Lockdown lifted for guild ${guildId}.`);
      }, 300000); // 5 minutes
    }
  },
};
