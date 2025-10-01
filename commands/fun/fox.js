const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("fox")
    .setDescription("Replies with a random fox picture!"),
  isPublic: true,
  async execute(interaction) {
    try {
      // Make a request to the RandomFox API
      const response = await fetch("https://randomfox.ca/floof/");
      const data = await response.json(); // Parse the JSON response

      // Create an embed to display the image
      const foxEmbed = new EmbedBuilder()
        .setColor("#FFA500") // Orange color
        .setTitle("Here's your random fox!")
        .setImage(data.image) // The URL of the fox image from the API
        .setTimestamp()
        .setFooter({ text: "Powered by randomfox.ca" });

      // Send the embed as a reply
      await interaction.editReply({ embeds: [foxEmbed] });
    } catch (error) {
      console.error("Error fetching fox picture:", error);
      await interaction.editReply({
        content:
          "Sorry, I couldn't fetch a fox picture right now. Please try again later.",
      });
    }
  },
};
