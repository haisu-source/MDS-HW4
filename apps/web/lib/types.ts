export type ReadingStyle = "gentle" | "direct" | "spiritual" | "analytical";

export type Profile = {
  id: string;
  email: string | null;
  display_name: string | null;
  city: string;
  city_key: string;
  zodiac_sign: string;
  reading_style: ReadingStyle;
};

export type LiveContext = {
  id: string;
  city: string;
  city_key: string;
  weather_code: number | null;
  temperature_c: number | null;
  weather_label: string | null;
  cloud_cover: number | null;
  precipitation_mm: number | null;
  lunar_phase: string;
  zodiac_context_tag: string | null;
  fetched_at: string;
};

export type TarotCard = {
  id: string;
  card_name: string;
  arcana: string;
  upright_meaning: string;
  reversed_meaning: string;
  keywords: string[];
};

export type Reading = {
  id: string;
  user_id: string;
  spread_type: "single_card" | "three_card" | "daily_draw";
  cards_drawn: Array<{ card_name: string; reversed: boolean }>;
  context_snapshot: Record<string, unknown>;
  reading_text: string;
  created_at: string;
};

export const ZODIAC_SIGNS = [
  "aries",
  "taurus",
  "gemini",
  "cancer",
  "leo",
  "virgo",
  "libra",
  "scorpio",
  "sagittarius",
  "capricorn",
  "aquarius",
  "pisces",
] as const;

export const READING_STYLES: ReadingStyle[] = [
  "gentle",
  "direct",
  "spiritual",
  "analytical",
];
