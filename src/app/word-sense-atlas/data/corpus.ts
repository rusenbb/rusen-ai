/**
 * Polysemy corpus for the Word Sense Atlas demo.
 *
 * Each entry lists the senses we want the embedding model to (hopefully)
 * separate, plus example sentences hand-tagged by sense. The atlas
 * displays one cluster per sense, projected from the embedding space.
 */

export type SenseId = string;

export type Sentence = {
  text: string;
  sense: SenseId;
};

export type WordEntry = {
  word: string;
  prompt: string;
  /** Order matters; controls colour assignment in the legend. */
  senses: { id: SenseId; label: string; gloss: string }[];
  sentences: Sentence[];
};

export const CORPUS: WordEntry[] = [
  {
    word: "bank",
    prompt: "Sit on a riverBANK or deposit money at a BANK?",
    senses: [
      { id: "money", label: "money", gloss: "the financial institution" },
      { id: "river", label: "river", gloss: "the edge of a river or lake" },
      { id: "trust", label: "rely on", gloss: "to count on something" },
      { id: "tilt", label: "tilt", gloss: "to incline (a vehicle)" },
    ],
    sentences: [
      { text: "She deposited her paycheck at the bank yesterday.", sense: "money" },
      { text: "The investment bank reported record profits this quarter.", sense: "money" },
      { text: "He took out a loan from the bank to buy his first car.", sense: "money" },
      { text: "The bank vault was guarded by reinforced steel doors.", sense: "money" },
      { text: "Online banking has replaced most teller visits.", sense: "money" },
      { text: "The bank manager approved her mortgage application.", sense: "money" },
      { text: "Interest rates set by the central bank affect every loan.", sense: "money" },
      { text: "ATMs replaced most simple bank transactions.", sense: "money" },
      { text: "We sat by the river bank watching ducks paddle by.", sense: "river" },
      { text: "The flood overwhelmed both banks of the Susquehanna.", sense: "river" },
      { text: "Reeds grew thick along the muddy bank of the stream.", sense: "river" },
      { text: "He cast his fishing line from the rocky bank.", sense: "river" },
      { text: "The opposite bank was lined with old willow trees.", sense: "river" },
      { text: "Erosion has eaten away the south bank of the river.", sense: "river" },
      { text: "A heron landed silently on the bank of the lake.", sense: "river" },
      { text: "You can bank on her to deliver the project on time.", sense: "trust" },
      { text: "Don't bank on the weather staying clear all weekend.", sense: "trust" },
      { text: "Investors banked on a strong fourth quarter.", sense: "trust" },
      { text: "I'm banking on this lead to break the case open.", sense: "trust" },
      { text: "The pilot banked the aircraft sharply to the left.", sense: "tilt" },
      { text: "Race cars bank into the curve at full throttle.", sense: "tilt" },
      { text: "She banked her bike low through the corner.", sense: "tilt" },
      { text: "The plane banked steeply over the harbour on approach.", sense: "tilt" },
    ],
  },
  {
    word: "spring",
    prompt: "Spring as a season, a coil, a water source, or a leap?",
    senses: [
      { id: "season", label: "season", gloss: "March through May" },
      { id: "coil", label: "coil", gloss: "the elastic mechanical part" },
      { id: "water", label: "water source", gloss: "natural water emerging from the ground" },
      { id: "jump", label: "jump", gloss: "to leap suddenly" },
    ],
    sentences: [
      { text: "Cherry blossoms bloom every spring in Washington.", sense: "season" },
      { text: "Spring training opens with rookies and veterans together.", sense: "season" },
      { text: "The crocuses are the first flowers to push through frost in spring.", sense: "season" },
      { text: "Last spring's heavy rains finally refilled the reservoir.", sense: "season" },
      { text: "Spring fashion arrives in stores by mid-February.", sense: "season" },
      { text: "Lambs are born throughout spring on hillside farms.", sense: "season" },
      { text: "By late spring the apple orchards were in full bloom.", sense: "season" },
      { text: "The mattress springs squeaked with every movement.", sense: "coil" },
      { text: "An old grandfather clock relies on a coiled spring for power.", sense: "coil" },
      { text: "She inspected the broken garage-door spring.", sense: "coil" },
      { text: "The spring inside the pen popped out and rolled across the table.", sense: "coil" },
      { text: "Industrial springs are tested for fatigue resistance over millions of cycles.", sense: "coil" },
      { text: "Hot springs in Iceland steam through the volcanic rock.", sense: "water" },
      { text: "The town drew its drinking water from a mountain spring.", sense: "water" },
      { text: "An old spring bubbled up at the edge of the meadow.", sense: "water" },
      { text: "Roman aqueducts carried spring water for miles into the city.", sense: "water" },
      { text: "The natural spring never freezes, even in January.", sense: "water" },
      { text: "She sprang from her chair when the alarm rang.", sense: "jump" },
      { text: "Tigers spring from cover in a single explosive leap.", sense: "jump" },
      { text: "The cat sprang onto the windowsill in one fluid motion.", sense: "jump" },
      { text: "He sprang to attention as the general entered the room.", sense: "jump" },
      { text: "Conclusions sprang to mind faster than she could vet them.", sense: "jump" },
      { text: "The dancer sprang lightly across the stage.", sense: "jump" },
    ],
  },
  {
    word: "match",
    prompt: "A match could be a stick, a contest, a pair, or a verb.",
    senses: [
      { id: "fire", label: "fire stick", gloss: "the small wooden stick that lights a flame" },
      { id: "contest", label: "contest", gloss: "a sports or competitive event" },
      { id: "pair", label: "pair", gloss: "two things that go together" },
      { id: "equal", label: "equal", gloss: "to rival or be the same as" },
    ],
    sentences: [
      { text: "She struck a match against the rough side of the box.", sense: "fire" },
      { text: "Wet matches won't light no matter how hard you try.", sense: "fire" },
      { text: "Strike-anywhere matches were once a household staple.", sense: "fire" },
      { text: "The match flickered briefly before catching the wick.", sense: "fire" },
      { text: "He kept a tin of waterproof matches for camping trips.", sense: "fire" },
      { text: "Old sulphur matches gave off an unmistakably acrid smell.", sense: "fire" },
      { text: "Even a single match can start a forest fire in dry weather.", sense: "fire" },
      { text: "The Champions League match drew millions of viewers worldwide.", sense: "contest" },
      { text: "Federer won the deciding match in straight sets.", sense: "contest" },
      { text: "The chess match lasted six hours and ended in a draw.", sense: "contest" },
      { text: "Grand slam matches are best of five for the men's draw.", sense: "contest" },
      { text: "Saturday's football match was called off due to dense fog.", sense: "contest" },
      { text: "The boxing match was stopped after a knockout in round three.", sense: "contest" },
      { text: "The blue tie is a perfect match for that grey suit.", sense: "pair" },
      { text: "We're a great match at the dinner table because we have opposite tastes.", sense: "pair" },
      { text: "The dating app claims to engineer compatible matches with embeddings.", sense: "pair" },
      { text: "Her résumé and the job description are an exact match.", sense: "pair" },
      { text: "Identical twins are a genetic match by definition.", sense: "pair" },
      { text: "He couldn't find a matching sock for his left foot.", sense: "pair" },
      { text: "Nothing can match the sunrise from the cabin porch.", sense: "equal" },
      { text: "Few sprinters can match Bolt's race-day speed.", sense: "equal" },
      { text: "His prose style matches the precision of his subject matter.", sense: "equal" },
      { text: "The new model matches its predecessor on every benchmark.", sense: "equal" },
      { text: "She matched him drink for drink at the reception.", sense: "equal" },
    ],
  },
];

/**
 * Stable visual palette per sense index. Tuned for readability on both
 * light and dark backgrounds.
 */
export const SENSE_COLORS = ["#0ea5e9", "#f59e0b", "#10b981", "#ec4899", "#8b5cf6"];
