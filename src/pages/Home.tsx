import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createSessionAsPartnerA } from "../lib/api";

export default function Home() {
  const navigate = useNavigate();
  const [starting, setStarting] = useState(false);

  async function handleStart() {
    setStarting(true);
    try {
      const sessionId = await createSessionAsPartnerA();
      navigate(`/session/${sessionId}/preferences`);
    } catch (err) {
      console.error(err);
      setStarting(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <div className="mb-3 text-5xl">🍿</div>
      <h1 className="text-3xl font-extrabold tracking-tight">
        Stop scrolling. <br /> Start watching.
      </h1>
      <p className="mt-3 text-white/60">
        Two people, two sets of preferences, one swipe deck. We'll find the movie or show you'll
        both actually watch tonight — and exactly where to stream it in India.
      </p>

      <button
        type="button"
        onClick={handleStart}
        disabled={starting}
        className="mt-10 w-full rounded-2xl bg-gradient-to-r from-ember-500 to-glow-500 py-4 text-lg font-bold text-white shadow-xl shadow-ember-500/25 transition-transform active:scale-[0.97] disabled:opacity-50"
      >
        {starting ? "Setting up..." : "Start movie night"}
      </button>
      <p className="mt-4 text-xs text-white/35">
        You'll set your mood first, then invite your partner with a QR code.
      </p>
    </div>
  );
}
