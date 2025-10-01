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
    const client = member.client; // Get the client from the member object

    // Ignore if lockdown is already active for guild
    if (lockdownActive.has(guildId)) {
      return;
    }

    const now = Date.now();
    const joinTimes = recentJoins.get(guildId) || [];

    const recent = joinTimes.filter(
      (time) => now - time < antiRaid.timeInterval
    );
    recent.push(now);
    recentJoins.set(guildId, recent);

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
      const membersToKick = await member.guild.members.fetch({
        query: "",
        limit: recent.length,
      });
      const recentMemberIds = membersToKick
        .filter((m) => recent.includes(m.joinedTimestamp))
        .map((m) => m.id);

      for (const id of recentMemberIds) {
        const memberToKick = await member.guild.members.fetch(id);
        if (memberToKick) {
          await memberToKick.kick("Automatic raid detection.");
        }
      }

      // End the lockdown after a set time
      setTimeout(() => {
        lockdownActive.delete(guildId);
        recentJoins.set(guildId, []);
        if (logChannel) {
          const embed = new EmbedBuilder()
            .setColor("Green")
            .setTitle("✅ Lockdown Lifted")
            .setDescription(
              "Server lockdown has ended. Normal operations have resumed."
            )
            .setTimestamp();
          logChannel.send({ embeds: [embed] });
        }
        console.log(`[Anti-Raid] Lockdown lifted for guild ${guildId}.`);
      }, 300000); // 5 minutes
    }
  },
};
