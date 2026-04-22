"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth, useUser, SignInButton, SignUpButton, SignOutButton } from "@clerk/nextjs";
import { supabase } from "../lib/supabase-browser";
import {
  READING_STYLES,
  ZODIAC_SIGNS,
  type LiveContext,
  type Profile,
  type Reading,
  type ReadingStyle,
  type TarotCard,
} from "../lib/types";
import { drawCards, generateReading } from "../lib/tarot-reading";

function slugifyCityKey(city: string): string {
  return city.trim().toLowerCase().replace(/\s+/g, "-");
}

export default function HomePage() {
  return (
    <Shell>
      <AuthGate />
    </Shell>
  );
}

function AuthGate() {
  const { isLoaded, isSignedIn, userId } = useAuth();

  if (!isLoaded) {
    return <p className="text-[var(--muted)]">Loading session…</p>;
  }

  if (!isSignedIn || !userId) {
    return <LandingAuth />;
  }

  return <Dashboard userId={userId} />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen px-6 py-10 text-ink sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex items-center justify-between">
          <p className="font-body text-sm uppercase tracking-[0.35em] text-slateblue">
            Real-Time Tarot AI
          </p>
          <p className="text-xs text-[var(--muted)]">
            Worker · Supabase · Realtime · Next.js
          </p>
        </header>
        {children}
      </div>
    </main>
  );
}

function LandingAuth() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
      <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--panel)] p-8">
        <h1 className="font-display text-4xl leading-tight">
          Tarot readings shaped by the live energy around you
        </h1>
        <p className="mt-4 text-[var(--muted)]">
          A Railway worker polls weather + lunar phase for your city. Supabase stores the
          latest context and pushes realtime updates to this page, where your reading is
          personalized by your zodiac sign and preferred reading style.
        </p>
        <ul className="mt-6 space-y-2 text-sm text-[var(--muted)]">
          <li>• Background worker → Supabase → Realtime → Next.js</li>
          <li>• Auth and per-user personalization</li>
          <li>• Immutable history for every reading</li>
        </ul>
      </section>
      <section className="rounded-[2rem] border border-[var(--border)] bg-white/80 p-8 flex flex-col items-center justify-center gap-4">
        <p className="text-sm text-[var(--muted)]">Sign in or create an account to begin.</p>
        <SignInButton mode="modal">
          <button className="w-full rounded-xl bg-ink py-3 text-white">Sign in</button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button className="w-full rounded-xl border border-[var(--border)] py-3">
            Sign up
          </button>
        </SignUpButton>
      </section>
    </div>
  );
}

function ProfileSetup({
  userId,
  onComplete,
}: {
  userId: string;
  onComplete: () => void;
}) {
  const { user } = useUser();
  const [city, setCity] = useState("Chicago");
  const [zodiac, setZodiac] = useState<(typeof ZODIAC_SIGNS)[number]>("aries");
  const [style, setStyle] = useState<ReadingStyle>("gentle");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const cityKey = slugifyCityKey(city);
    const { error: insertError } = await supabase.from("profiles").insert({
      id: userId,
      email: user?.primaryEmailAddress?.emailAddress ?? null,
      display_name: user?.fullName ?? "",
      city,
      city_key: cityKey,
      zodiac_sign: zodiac,
      reading_style: style,
    });
    if (insertError) {
      setError(insertError.message);
      setSubmitting(false);
      return;
    }
    onComplete();
  }

  return (
    <div className="mx-auto max-w-md">
      <section className="rounded-[2rem] border border-[var(--border)] bg-white/80 p-8">
        <h2 className="font-display text-2xl">Complete your profile</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Set your preferences to personalize your tarot readings.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-3 text-sm">
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-slateblue">City</span>
            <input
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-slateblue">
              Zodiac sign
            </span>
            <select
              value={zodiac}
              onChange={(e) =>
                setZodiac(e.target.value as (typeof ZODIAC_SIGNS)[number])
              }
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2"
            >
              {ZODIAC_SIGNS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-slateblue">
              Reading style
            </span>
            <select
              value={style}
              onChange={(e) => setStyle(e.target.value as ReadingStyle)}
              className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2"
            >
              {READING_STYLES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-ink py-3 text-white disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Save & continue"}
          </button>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </form>
      </section>
    </div>
  );
}

function Dashboard({ userId }: { userId: string }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [context, setContext] = useState<LiveContext | null>(null);
  const [deck, setDeck] = useState<TarotCard[]>([]);
  const [history, setHistory] = useState<Reading[]>([]);
  const [status, setStatus] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      setStatus(error.message);
      setProfileLoading(false);
      return;
    }
    setProfile(data as Profile | null);
    setProfileLoading(false);
  }, [userId]);

  const loadContext = useCallback(
    async (cityKey: string) => {
      const { data } = await supabase
        .from("live_context")
        .select("*")
        .eq("city_key", cityKey)
        .maybeSingle();
      setContext((data as LiveContext | null) ?? null);
    },
    [],
  );

  const loadDeck = useCallback(async () => {
    const { data } = await supabase.from("tarot_cards").select("*");
    setDeck((data as TarotCard[] | null) ?? []);
  }, []);

  const loadHistory = useCallback(async () => {
    const { data } = await supabase
      .from("readings")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(8);
    setHistory((data as Reading[] | null) ?? []);
  }, [userId]);

  useEffect(() => {
    loadProfile();
    loadDeck();
    loadHistory();
  }, [loadProfile, loadDeck, loadHistory]);

  useEffect(() => {
    if (!profile) return;
    loadContext(profile.city_key);
    const channel = supabase
      .channel(`live_context:${profile.city_key}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "live_context",
          filter: `city_key=eq.${profile.city_key}`,
        },
        (payload) => {
          const next = (payload.new as LiveContext | null) ?? null;
          if (next) setContext(next);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile, loadContext]);

  const sortedDeck = useMemo(
    () => [...deck].sort((a, b) => a.card_name.localeCompare(b.card_name)),
    [deck],
  );

  async function saveProfile(update: Partial<Profile>) {
    if (!profile) return;
    const nextCityKey =
      update.city !== undefined ? slugifyCityKey(update.city) : profile.city_key;
    const { error } = await supabase
      .from("profiles")
      .update({
        ...update,
        city_key: nextCityKey,
      })
      .eq("id", profile.id);
    if (error) {
      setStatus(error.message);
      return;
    }
    setStatus("Profile updated.");
    loadProfile();
  }

  async function drawOnce() {
    if (!profile) return;
    if (sortedDeck.length === 0) {
      setStatus("Deck is empty — run supabase/seed.sql to load the major arcana.");
      return;
    }
    const draws = drawCards({ deck: sortedDeck, count: 1 });
    const readingText = generateReading({ profile, context, draws });

    let contextHistoryId: string | null = null;
    if (context) {
      const { data: snapshotRow } = await supabase
        .from("context_history")
        .insert({
          city: context.city,
          city_key: context.city_key,
          weather_code: context.weather_code,
          temperature_c: context.temperature_c,
          weather_label: context.weather_label,
          cloud_cover: context.cloud_cover,
          precipitation_mm: context.precipitation_mm,
          lunar_phase: context.lunar_phase,
          zodiac_context_tag: context.zodiac_context_tag,
          fetched_at: context.fetched_at,
        })
        .select("id")
        .maybeSingle();
      contextHistoryId = (snapshotRow as { id: string } | null)?.id ?? null;
    }

    const { error } = await supabase.from("readings").insert({
      user_id: profile.id,
      spread_type: "single_card",
      cards_drawn: draws.map((d) => ({
        card_name: d.card.card_name,
        reversed: d.reversed,
      })),
      context_history_id: contextHistoryId,
      context_snapshot: context ? { ...context } : {},
      reading_text: readingText,
    });
    if (error) {
      setStatus(error.message);
      return;
    }
    setStatus(null);
    loadHistory();
  }

  if (profileLoading) {
    return <p className="text-[var(--muted)]">Loading profile…</p>;
  }

  if (!profile) {
    return <ProfileSetup userId={userId} onComplete={loadProfile} />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--panel)] p-8">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl">Your reading</h1>
          <SignOutButton>
            <button
              type="button"
              className="text-xs uppercase tracking-wider text-slateblue underline-offset-4 hover:underline"
            >
              Sign out
            </button>
          </SignOutButton>
        </div>
        <p className="mt-3 text-sm text-[var(--muted)]">
          Signed in as {profile.email}
        </p>
        <button
          type="button"
          onClick={drawOnce}
          className="mt-6 rounded-full bg-ink px-6 py-3 text-sm uppercase tracking-wider text-white"
        >
          Draw a card
        </button>
        {status && (
          <p className="mt-4 text-xs text-[var(--muted)]">{status}</p>
        )}
        <div className="mt-8 space-y-4">
          <h2 className="font-display text-2xl">Recent readings</h2>
          {history.length === 0 && (
            <p className="text-sm text-[var(--muted)]">
              No readings yet — draw your first card above.
            </p>
          )}
          {history.map((r) => (
            <article
              key={r.id}
              className="rounded-2xl border border-[var(--border)] bg-white/70 p-4"
            >
              <p className="text-xs uppercase tracking-wider text-slateblue">
                {new Date(r.created_at).toLocaleString()} · {r.spread_type}
              </p>
              <p className="mt-2 whitespace-pre-line text-sm leading-6">
                {r.reading_text}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <div className="rounded-[2rem] border border-[var(--border)] bg-[#fffaf4]/90 p-6">
          <p className="text-sm uppercase tracking-[0.3em] text-slateblue">
            Live context
          </p>
          {context ? (
            <div className="mt-6 space-y-3">
              <ContextRow label="City" value={context.city} />
              <ContextRow
                label="Weather"
                value={
                  context.weather_label
                    ? `${context.weather_label}${
                        context.temperature_c !== null
                          ? ` · ${context.temperature_c}°C`
                          : ""
                      }`
                    : "Unknown"
                }
              />
              <ContextRow label="Lunar phase" value={context.lunar_phase} />
              <ContextRow
                label="Cosmic tone"
                value={context.zodiac_context_tag ?? "—"}
              />
              <p className="pt-2 text-xs text-[var(--muted)]">
                Last updated {new Date(context.fetched_at).toLocaleString()}
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-[var(--muted)]">
              Waiting for the worker to post a context row for your city. Check back in a
              few minutes, or run the worker locally.
            </p>
          )}
        </div>

        <ProfileCard profile={profile} onSave={saveProfile} />
      </section>
    </div>
  );
}

function ProfileCard({
  profile,
  onSave,
}: {
  profile: Profile;
  onSave: (update: Partial<Profile>) => Promise<void>;
}) {
  const [city, setCity] = useState(profile.city);
  const [zodiac, setZodiac] = useState(profile.zodiac_sign);
  const [style, setStyle] = useState<ReadingStyle>(profile.reading_style);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCity(profile.city);
    setZodiac(profile.zodiac_sign);
    setStyle(profile.reading_style);
  }, [profile.city, profile.zodiac_sign, profile.reading_style]);

  async function handleSave() {
    setSaving(true);
    await onSave({ city, zodiac_sign: zodiac, reading_style: style });
    setSaving(false);
  }

  return (
    <div className="rounded-[2rem] border border-[var(--border)] bg-white/80 p-6">
      <p className="text-sm uppercase tracking-[0.3em] text-slateblue">Profile</p>
      <div className="mt-4 space-y-3 text-sm">
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-slateblue">City</span>
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-slateblue">
            Zodiac sign
          </span>
          <select
            value={zodiac}
            onChange={(e) => setZodiac(e.target.value)}
            className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2"
          >
            {ZODIAC_SIGNS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-wider text-slateblue">
            Reading style
          </span>
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value as ReadingStyle)}
            className="mt-1 w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2"
          >
            {READING_STYLES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-xl bg-ink py-2 text-white disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save profile"}
        </button>
      </div>
    </div>
  );
}

function ContextRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white/70 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.24em] text-slateblue">{label}</p>
      <p className="mt-1 text-base">{value}</p>
    </div>
  );
}
