import { useEffect, useState } from "react";

const MESSAGES = [
  "Reading the room...",
  "Negotiating between two very different moods...",
  "Asking Gemini to find common ground...",
  "Scanning what's actually good tonight...",
  "Checking what's streaming in India right now...",
];

export function LoadingScene({ label }: { label?: string }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % MESSAGES.length), 1800);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 py-10 text-center">
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 animate-ping rounded-full bg-glow-500/30" />
        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-gradient-to-br from-ember-500 to-glow-500 text-2xl">
          🎞️
        </div>
      </div>
      <p className="text-sm font-medium text-white/70 transition-opacity duration-300">
        {label ?? MESSAGES[i]}
      </p>
    </div>
  );
}
