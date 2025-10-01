// Calculates the XP needed to complete a specific level (e.g., to go from L0 to L1)
function xpForLevel(level) {
  return 5 * level ** 2 + 50 * level + 100;
}

// Calculates the TOTAL CUMULATIVE XP needed to reach a certain level
function getXpForLevel(level) {
  let totalXp = 0;
  for (let i = 0; i < level; i++) {
    totalXp += xpForLevel(i);
  }
  return totalXp;
}

module.exports = { xpForLevel, getXpForLevel };
