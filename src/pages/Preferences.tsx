import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { OptionPills } from "../components/OptionPills";
import { DEFAULT_PREFERENCES, ERAS, LANGUAGES, MIN_RATINGS, MOODS } from "../lib/constants";
import { getLocalIdentity } from "../lib/identity";
import { startMatching, submitPreferences } from "../lib/api";
import type { Era, Language, MinRating, Mood, Preferences as PreferencesType } from "../lib/types";
import { useSession } from "../hooks/useSession";

export default function Preferences() {
  const { sessionId = "" } = useParams();
  const navigate = useNavigate();
  const identity = getLocalIdentity(sessionId);
  const { otherPartner } = useSession(sessionId);

  const [prefs, setPrefs] = useState<PreferencesType>({ ...DEFAULT_PREFERENCES });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!identity) {
    return (
      <Shell>
        <p className="text-white/70">
          We couldn't find your invite for this movie night on this device. Ask your partner to resend the link.
        </p>
      </Shell>
    );
  }

  function toggleMood(m: Mood) {
    setPrefs((p) => ({
      ...p,
      moods: p.moods.includes(m) ? p.moods.filter((x) => x !== m) : [...p.moods, m],
    }));
  }

  function toggleLanguage(l: Language) {
    setPrefs((p) => {
      if (l === "Any") return { ...p, languages: p.languages.includes("Any") ? [] : ["Any"] };
      const withoutAny = p.languages.filter((x) => x !== "Any");
      const next = withoutAny.includes(l) ? withoutAny.filter((x) => x !== l) : [...withoutAny, l];
      return { ...p, languages: next };
    });
  }

  function toggleEra(e: Era) {
    setPrefs((p) => {
      if (e === "Any") return { ...p, eras: p.eras.includes("Any") ? [] : ["Any"] };
      const withoutAny = p.eras.filter((x) => x !== "Any");
      const next = withoutAny.includes(e) ? withoutAny.filter((x) => x !== e) : [...withoutAny, e];
      return { ...p, eras: next };
    });
  }

  const canSubmit = prefs.moods.length > 0 && prefs.languages.length > 0 && prefs.eras.length > 0;

  async function handleSubmit() {
    if (!identity || !canSubmit) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitPreferences(identity.partnerId, prefs);
      navigate(`/session/${sessionId}/waiting`);
      if (otherPartner?.submitted_at) {
        startMatching(sessionId).catch((e) => console.error("start-matching failed", e));
      }
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  }

  return (
    <Shell>
      <header className="mb-6">
        <p className="text-sm font-semibold uppercase tracking-widest text-ember-400">
          Partner {identity.role}
        </p>
        <h1 className="mt-1 text-2xl font-bold">What are you in the mood for tonight?</h1>
        <p className="mt-1 text-sm text-white/50">
          Answer honestly — your partner can't see this until you both submit.
        </p>
      </header>

      <div className="space-y-7">
        <Field label="Mood" hint="Pick as many as fit">
          <OptionPills options={MOODS} selected={prefs.moods} onToggle={toggleMood} columns={2} />
        </Field>

        <Field label="Describe the vibe (optional)">
          <textarea
            value={prefs.moodText}
            onChange={(e) => setPrefs((p) => ({ ...p, moodText: e.target.value }))}
            placeholder="e.g. something with a twist ending, nothing too heavy, we just had a long week..."
            rows={3}
            maxLength={280}
            className="w-full resize-none rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white placeholder-white/30 outline-none focus:border-glow-400"
          />
        </Field>

        <Field label="Language" hint="Any wipes the rest">
          <OptionPills options={LANGUAGES} selected={prefs.languages} onToggle={toggleLanguage} columns={3} />
        </Field>

        <Field label="Content type">
          <div className="grid grid-cols-2 gap-2">
            {(["movies", "series"] as const).map((ct) => (
              <button
                key={ct}
                type="button"
                onClick={() => setPrefs((p) => ({ ...p, contentType: ct }))}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-all active:scale-95 ${
                  prefs.contentType === ct
                    ? "border-glow-400 bg-glow-500/20 text-white"
                    : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                }`}
              >
                {ct === "movies" ? "Movies only" : "Include series"}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Minimum rating">
          <div className="grid grid-cols-4 gap-2">
            {MIN_RATINGS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setPrefs((p) => ({ ...p, minRating: r as MinRating }))}
                className={`rounded-xl border px-2 py-2.5 text-sm font-medium transition-all active:scale-95 ${
                  prefs.minRating === r
                    ? "border-glow-400 bg-glow-500/20 text-white"
                    : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                }`}
              >
                {r}+
              </button>
            ))}
          </div>
          {prefs.minRating === 9 && (
            <p className="mt-1.5 text-xs text-ember-400/90">Heads up — very few titles clear a 9.0 bar.</p>
          )}
        </Field>

        <Field label="Era" hint="Any wipes the rest">
          <OptionPills
            options={ERAS.map((e) => e.value)}
            selected={prefs.eras}
            onToggle={toggleEra}
            columns={2}
          />
        </Field>
      </div>

      {error && <p className="mt-4 text-sm text-ember-400">{error}</p>}

      <button
        type="button"
        disabled={!canSubmit || submitting}
        onClick={handleSubmit}
        className="mt-8 w-full rounded-2xl bg-gradient-to-r from-ember-500 to-glow-500 py-3.5 text-base font-semibold text-white shadow-lg shadow-ember-500/20 transition-transform active:scale-[0.98] disabled:opacity-40"
      >
        {submitting ? "Saving..." : "Lock in my answers"}
      </button>
    </Shell>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <label className="text-sm font-semibold text-white/90">{label}</label>
        {hint && <span className="text-xs text-white/35">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-md px-5 pb-10 pt-8">
      {children}
    </div>
  );
}
