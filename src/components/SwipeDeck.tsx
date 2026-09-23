import { useState } from "react";
import { SwipeCard } from "./SwipeCard";
import type { Title } from "../lib/types";

const VISIBLE_STACK = 3;

interface SwipeDeckProps {
  titles: Title[];
  onSwipe: (title: Title, direction: "left" | "right") => void;
  onFinished: () => void;
}

export function SwipeDeck({ titles, onSwipe, onFinished }: SwipeDeckProps) {
  const [index, setIndex] = useState(0);

  function handleSwipe(direction: "left" | "right") {
    const title = titles[index];
    onSwipe(title, direction);
    const next = index + 1;
    setIndex(next);
    if (next >= titles.length) onFinished();
  }

  const visible = titles.slice(index, index + VISIBLE_STACK);

  if (visible.length === 0) return null;

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-[62vh] max-h-[560px] w-full max-w-sm">
        {visible.map((title, i) => (
          <SwipeCard key={title.id} title={title} isTop={i === 0} stackIndex={i} onSwipe={handleSwipe} />
        ))}
      </div>

      <div className="mt-6 flex items-center gap-6">
        <button
          type="button"
          onClick={() => handleSwipe("left")}
          aria-label="Pass"
          className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white/5 text-2xl text-ember-400 shadow-lg transition-transform active:scale-90"
        >
          ✕
        </button>
        <button
          type="button"
          onClick={() => handleSwipe("right")}
          aria-label="Like"
          className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-ember-500 to-glow-500 text-2xl shadow-xl shadow-ember-500/30 transition-transform active:scale-90"
        >
          ♥
        </button>
      </div>
    </div>
  );
}
