import type { LiveContext, Profile, ReadingStyle, TarotCard } from "./types";

type Draw = {
  card: TarotCard;
  reversed: boolean;
};

const STYLE_OPENERS: Record<ReadingStyle, string[]> = {
  gentle: [
    "Take a slow breath before reading on.",
    "A soft nudge from the cards today:",
    "The deck wants to hold space for you:",
  ],
  direct: [
    "Here is what the cards are saying, plainly:",
    "Read this once and act on it:",
    "No softening — here is the signal:",
  ],
  spiritual: [
    "The deck opens a quiet doorway for you:",
    "Spirit is leaving a small map on the table:",
    "A threshold moment, marked by the cards:",
  ],
  analytical: [
    "A structured read of the current pull:",
    "Breaking down today's draw:",
    "A practical interpretation of the cards:",
  ],
};

const ZODIAC_HINTS: Record<string, string> = {
  aries: "Your fire likes to move first; the cards ask where that direction actually leads.",
  taurus: "Your steadiness is a strength, but the cards are nudging one specific edge.",
  gemini: "You move between ideas quickly; the cards suggest choosing one to follow deeper.",
  cancer: "Your emotional radar is accurate today; trust what it is already telling you.",
  leo: "Your warmth is visible; the cards ask where it is most needed.",
  virgo: "Precision is your gift; the cards invite a tiny release of control.",
  libra: "Balance is your compass; the cards suggest a small, deliberate tilt.",
  scorpio: "Your depth sees through surface noise; name the pattern you already notice.",
  sagittarius: "Your vision is wide; the cards ask you to ground one step of it today.",
  capricorn: "Your structure holds; the cards point at which stone to set next.",
  aquarius: "Your angle is original; the cards suggest translating it for one person.",
  pisces: "Your sensitivity is accurate; the cards ask you to honor it without drifting.",
};

function pick<T>(items: T[], seed: number): T {
  return items[Math.abs(seed) % items.length] as T;
}

function hashString(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) {
    h = (h * 31 + value.charCodeAt(i)) | 0;
  }
  return h;
}

function weatherSentence(context: LiveContext | null): string {
  if (!context) {
    return "The context worker has not yet posted weather for your city — the reading will lean on the deck alone.";
  }

  const temperature =
    context.temperature_c === null ? "" : ` around ${context.temperature_c}°C`;
  const weather = context.weather_label?.toLowerCase() ?? "mixed";
  return `Outside your window it is ${weather}${temperature}, and the moon is in a ${context.lunar_phase.toLowerCase()} phase.`;
}

export function generateReading(input: {
  profile: Profile;
  context: LiveContext | null;
  draws: Draw[];
}): string {
  const { profile, context, draws } = input;
  const seed = hashString(
    [
      profile.id,
      context?.fetched_at ?? "",
      ...draws.map((d) => `${d.card.card_name}:${d.reversed}`),
    ].join("|"),
  );

  const opener = pick(STYLE_OPENERS[profile.reading_style], seed);
  const zodiacLine =
    ZODIAC_HINTS[profile.zodiac_sign.toLowerCase()] ??
    "Your sign adds its own color, so let the reading land in your voice.";
  const weatherLine = weatherSentence(context);
  const toneLine = context?.zodiac_context_tag
    ? `Cosmic tone right now: ${context.zodiac_context_tag.toLowerCase()}.`
    : "";

  const cardParagraphs = draws.map((draw, idx) => {
    const meaning = draw.reversed
      ? draw.card.reversed_meaning
      : draw.card.upright_meaning;
    const position =
      draws.length === 1
        ? "The card for you"
        : idx === 0
          ? "Past / ground"
          : idx === 1
            ? "Present / focus"
            : "Next / invitation";
    const state = draw.reversed ? "reversed" : "upright";
    return `${position}: **${draw.card.card_name}** (${state}). ${meaning}`;
  });

  return [
    opener,
    weatherLine,
    toneLine,
    "",
    ...cardParagraphs,
    "",
    zodiacLine,
  ]
    .filter(Boolean)
    .join("\n");
}

export function drawCards(options: {
  deck: TarotCard[];
  count: number;
  seed?: number;
}): Draw[] {
  const { deck, count } = options;
  if (deck.length === 0) return [];
  const shuffled = [...deck];
  // Fisher–Yates with Math.random is fine here — a reading is not a crypto op.
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j] as TarotCard, shuffled[i] as TarotCard];
  }
  return shuffled.slice(0, Math.min(count, shuffled.length)).map((card) => ({
    card,
    reversed: Math.random() < 0.3,
  }));
}
