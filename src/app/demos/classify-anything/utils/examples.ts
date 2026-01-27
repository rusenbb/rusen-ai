// Preset label categories
export const PRESET_LABELS: Record<string, string[]> = {
  sentiment: ["positive", "negative", "neutral"],
  topic: ["sports", "politics", "technology", "entertainment", "science"],
  intent: ["question", "statement", "request", "complaint"],
  spam: ["spam", "not spam"],
  emotion: ["joy", "sadness", "anger", "fear", "surprise"],
  urgency: ["urgent", "normal", "low priority"],
};

// Example texts for quick testing
export const EXAMPLE_TEXTS = [
  {
    label: "Product Review",
    text: "This phone has an amazing camera and the battery lasts all day. Best purchase I've made this year!",
  },
  {
    label: "News Headline",
    text: "Scientists discover high concentration of water ice beneath Mars surface, raising hopes for future colonization.",
  },
  {
    label: "Support Request",
    text: "My order #12345 hasn't arrived yet and it's been 2 weeks. Can someone please help me track this package?",
  },
  {
    label: "Social Media",
    text: "Just finished watching the game. What a disappointing performance from our team in the final quarter.",
  },
  {
    label: "Email",
    text: "Congratulations! You've won a free iPhone! Click here immediately to claim your prize before it expires!",
  },
  {
    label: "Tech Article",
    text: "The new AI model demonstrates unprecedented reasoning capabilities, outperforming previous benchmarks by 15%.",
  },
];
