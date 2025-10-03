const { EmbedBuilder } = require("discord.js");

// Map<guildId, Map<userId, { actionType: [timestamps] }>>
const userActions = new Map();

// The `client` object is now passed as a parameter to get access to the database
async function recordAction(guild, executor, actionType, client) {
  if (!executor) return;

  const db = client.db;

  // --- Fetch config from DB ---
  const configRef = db
    .collection("guilds")
    .doc(guild.id)
    .collection("config")
    .doc("antinuke");
  const doc = await configRef.get();
  const config = doc.data();

  // --- NEW: Definitive Debugging Log ---
  console.log(
    `[Anti-Nuke Manager] Fetched config for guild ${guild.id}:`,
    JSON.stringify(config, null, 2) || "No document found."
  );

  // --- Pre-checks ---
  if (!config || !config.enabled) {
    console.log(
      "[Anti-Nuke Manager] System is disabled or not configured. Aborting."
    );
    return;
  }
  if (executor.id === guild.ownerId) {
    console.log(
      `[Anti-Nuke Manager] Action by server owner ${executor.tag} ignored.`
    );
    return;
  }
  if (config.whitelist && config.whitelist.includes(executor.id)) {
    console.log(
      `[Anti-Nuke Manager] Action by whitelisted user ${executor.tag} ignored.`
    );
    return;
  }

  // --- Record the action ---
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

  console.log(
    `[Anti-Nuke Manager] Recorded ${actionType} for ${executor.tag}. Total actions for this type: ${actions[actionType].length}`
  );

  // --- Check if thresholds are exceeded ---
  checkActions(guild, executor, actionType, config, client);
}

function checkActions(guild, user, actionType, config, client) {
  console.log(
    `[Anti-Nuke Manager] Checking actions for ${user.tag} | Type: ${actionType}`
  );

  const guildUserActions = userActions.get(guild.id);
  if (!guildUserActions || !guildUserActions.has(user.id)) return;

  const actions = guildUserActions.get(user.id);
  const timestamps = actions[actionType];

  if (!config.limits) {
    console.log(
      `[Anti-Nuke Manager] 'limits' object not found in config. Did you set thresholds?`
    );
    return;
  }
  if (!config.limits[actionType]) {
    console.log(
      `[Anti-Nuke Manager] No threshold configured for action type: ${actionType}.`
    );
    return;
  }

  const { limit, interval } = config.limits[actionType];
  const intervalMs = interval * 1000;

  // Filter out old actions
  const recentActions = timestamps.filter((t) => Date.now() - t < intervalMs);
  actions[actionType] = recentActions; // Prune the array

  console.log(
    `[Anti-Nuke Manager] User has ${recentActions.length} recent actions. Limit is ${limit} in ${interval}s.`
  );

  if (recentActions.length >= limit) {
    console.log(
      `[Anti-Nuke Manager] Limit exceeded! Triggering punishment for ${user.tag}.`
    );
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
    if (!member) {
      console.log(
        `[Anti-Nuke Punishment] Could not find member ${user.tag} in the guild.`
      );
      return;
    }

    console.log(
      `[Anti-Nuke Punishment] Checking if ${user.tag} is punishable.`
    );
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

    console.log(
      `[Anti-Nuke Punishment] Punishing ${user.tag}. Removing all roles.`
    );
    await member.roles.set([], `Anti-Nuke Triggered: ${reason}`);

    // --- Alert the Owner ---
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
    console.log(
      `[Anti-Nuke Punishment] Successfully punished user and alerted server owner.`
    );
  } catch (error) {
    console.error("Error in triggerPunishment:", error);
  }
}

module.exports = { recordAction };
