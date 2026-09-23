import { useState } from "react";
import { useParams } from "react-router-dom";
import { useSession } from "../hooks/useSession";
import { getLocalIdentity } from "../lib/identity";
import { submitRating } from "../lib/api";
import { LoadingScene } from "../components/LoadingScene";

export default function Rate() {
  const { sessionId = "" } = useParams();
  const identity = getLocalIdentity(sessionId);
  const { match, loading } = useSession(sessionId);
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  if (loading || !match || !identity) {
    return (
      <Shell>
        <LoadingScene />
      </Shell>
    );
  }

  async function handleSubmit() {
    if (!rating) return;
    setSaving(true);
    try {
      await submitRating(sessionId, identity!.partnerId, match!.title_id, rating, notes);
      setSubmitted(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  if (submitted) {
    return (
      <Shell>
        <p className="mb-2 text-4xl">✅</p>
        <h1 className="text-xl font-bold">Rating saved</h1>
        <p className="mt-1 text-sm text-white/55">
          We'll use this to get better at picking for you two next time.
        </p>
      </Shell>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-md px-5 pb-10 pt-10">
      <h1 className="text-xl font-bold">How was {match.title.name}?</h1>
      <p className="mt-1 text-sm text-white/55">Rate it for Partner {identity.role}.</p>

      <div className="mt-6 flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            className={`text-4xl transition-transform active:scale-90 ${
              n <= rating ? "text-yellow-400" : "text-white/20"
            }`}
            aria-label={`${n} star`}
          >
            ★
          </button>
        ))}
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Any notes? (optional)"
        rows={3}
        className="mt-6 w-full resize-none rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-white placeholder-white/30 outline-none focus:border-glow-400"
      />

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!rating || saving}
        className="mt-6 w-full rounded-2xl bg-gradient-to-r from-ember-500 to-glow-500 py-3.5 text-base font-semibold text-white disabled:opacity-40"
      >
        {saving ? "Saving..." : "Save rating"}
      </button>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      {children}
    </div>
  );
}
