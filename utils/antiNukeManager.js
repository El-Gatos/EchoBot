const { EmbedBuilder } = require("discord.js");

// Map<guildId, Map<userId, { actionType: [timestamps] }>>
const userActions = new Map();

async function recordAction(guild, executor, actionType, client) {
  if (!executor) return;

  const db = client.db;
  const configRef = db
    .collection("guilds")
    .doc(guild.id)
    .collection("config")
    .doc("antinuke");

  try {
    const doc = await configRef.get();
    const config = doc.data();

    // Pre-checks
    if (!config || !config.enabled) {
      return;
    }
    if (executor.id === guild.ownerId) return;
    if (config.whitelist && config.whitelist.includes(executor.id)) return;

    // Record the action
    if (!userActions.has(guild.id)) {
      userActions.set(guild.id, new Map());
    }
    const guildUserActions = userActions.get(guild.id);

    if (!guildUserActions.has(executor.id)) {
      guildUserActions.set(executor.id, {});
    }
    const actions = guildUserActions.get(executor.id);

    if (!actions[actionType]) {
      actions[actionType] = [];
    }
    actions[actionType].push(Date.now());

    // Check if thresholds are exceeded
    checkActions(guild, executor, actionType, config);
  } catch (error) {
    console.error("[Anti-Nuke Manager] Error in recordAction:", error);
  }
}

function checkActions(guild, user, actionType, config) {
  const guildUserActions = userActions.get(guild.id);
  if (!guildUserActions || !guildUserActions.has(user.id)) return;

  const actions = guildUserActions.get(user.id);
  const timestamps = actions[actionType];

  if (!timestamps || !config.limits || !config.limits[actionType]) {
    return;
  }

  const { limit, interval } = config.limits[actionType];
  const intervalMs = interval * 1000;

  // Filter out old actions
  const recentActions = timestamps.filter((t) => Date.now() - t < intervalMs);
  actions[actionType] = recentActions; // Prune the array

  if (recentActions.length >= limit) {
    triggerPunishment(
      guild,
      user,
      `Exceeded ${actionType} limit (${recentActions.length} actions).`
    );
    // Clear actions for this user to prevent spamming punishments
    actions[actionType] = [];
  }
}

async function triggerPunishment(guild, user, reason) {
  try {
    const member = await guild.members.fetch(user.id);
    if (!member) return;

    if (!member.manageable) {
      console.error(
        `[Anti-Nuke Punishment] FAILED: Cannot punish ${user.tag}. Their role is higher than or equal to the bot's role.`
      );
      const owner = await guild.fetchOwner();
      await owner.send(
        `**CRITICAL ANTI-NUKE FAILURE** in your server **${guild.name}**!\nI detected that **${user.tag}** was triggering the anti-nuke system, but I could not remove their roles because their role is higher than mine. Please investigate immediately.`
      );
      return;
    }

    await member.roles.set([], `Anti-Nuke Triggered: ${reason}`);

    // Alert the Owner
    const owner = await guild.fetchOwner();
    const embed = new EmbedBuilder()
      .setColor("Red")
      .setTitle("🚨 Anti-Nuke System Triggered!")
      .setDescription(
        `The anti-nuke system was triggered in your server **${guild.name}**. I have taken protective action.`
      )
      .addFields(
        { name: "Suspected User", value: user.tag, inline: true },
        { name: "Reason", value: reason, inline: true },
        {
          name: "Action Taken",
          value: "All roles have been removed from this user.",
        }
      )
      .setTimestamp();

    await owner.send({ embeds: [embed] });
  } catch (error) {
    console.error("Error in triggerPunishment:", error);
  }
}

module.exports = { recordAction };
