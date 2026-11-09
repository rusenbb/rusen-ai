/**
 * Each example pairs a text with labels a fixed classifier would not have,
 * so the first run shows that the categories are yours to invent.
 */
export const EXAMPLES = [
  {
    name: "Recipe",
    text: "Whisk two eggs with a pinch of salt, fold in the cold butter, and let the dough rest overnight before rolling it out.",
    labels: ["recipe", "poem", "legal text"],
  },
  {
    name: "Review",
    text: "This phone has an amazing camera and the battery lasts all day. Best purchase I've made this year!",
    labels: ["praise", "complaint", "question"],
  },
  {
    name: "Support",
    text: "My order #12345 hasn't arrived yet and it's been 2 weeks. Can someone please help me track this package?",
    labels: ["shipping problem", "billing", "product question"],
  },
  {
    name: "Inbox",
    text: "Congratulations! You've won a free iPhone! Click here immediately to claim your prize before it expires!",
    labels: ["spam", "personal", "work"],
  },
  {
    name: "Headline",
    text: "Scientists discover high concentration of water ice beneath Mars surface, raising hopes for future colonization.",
    labels: ["space", "politics", "sport"],
  },
] as const;
