import { motion, useAnimation, useMotionValue, useTransform } from "framer-motion";
import type { PanInfo } from "framer-motion";
import type { Title } from "../lib/types";

const SWIPE_THRESHOLD = 120;

interface SwipeCardProps {
  title: Title;
  isTop: boolean;
  stackIndex: number;
  onSwipe: (direction: "left" | "right") => void;
}

export function SwipeCard({ title, isTop, stackIndex, onSwipe }: SwipeCardProps) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-300, 300], [-18, 18]);
  const likeOpacity = useTransform(x, [20, 120], [0, 1]);
  const passOpacity = useTransform(x, [-120, -20], [1, 0]);
  const controls = useAnimation();

  function handleDragEnd(_: unknown, info: PanInfo) {
    if (info.offset.x > SWIPE_THRESHOLD) {
      controls.start({ x: 500, rotate: 25, opacity: 0, transition: { duration: 0.35 } }).then(() =>
        onSwipe("right"),
      );
    } else if (info.offset.x < -SWIPE_THRESHOLD) {
      controls.start({ x: -500, rotate: -25, opacity: 0, transition: { duration: 0.35 } }).then(() =>
        onSwipe("left"),
      );
    } else {
      controls.start({ x: 0, rotate: 0, transition: { type: "spring", stiffness: 300, damping: 25 } });
    }
  }

  const runtime = title.runtimeMinutes
    ? title.runtimeMinutes >= 60
      ? `${Math.floor(title.runtimeMinutes / 60)}h ${title.runtimeMinutes % 60}m`
      : `${title.runtimeMinutes}m`
    : null;

  return (
    <motion.div
      className="absolute inset-0"
      style={{
        x: isTop ? x : 0,
        rotate: isTop ? rotate : 0,
        zIndex: 100 - stackIndex,
        scale: 1 - stackIndex * 0.04,
        top: stackIndex * 10,
      }}
      animate={isTop ? controls : { scale: 1 - stackIndex * 0.04, top: stackIndex * 10 }}
      drag={isTop ? "x" : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={1}
      onDragEnd={isTop ? handleDragEnd : undefined}
      whileTap={isTop ? { cursor: "grabbing" } : undefined}
    >
      <div className="relative flex h-full w-full flex-col overflow-hidden rounded-3xl bg-ink-800 shadow-2xl shadow-black/50">
        {isTop && (
          <>
            <motion.div
              style={{ opacity: likeOpacity }}
              className="pointer-events-none absolute left-5 top-6 z-10 rotate-[-12deg] rounded-lg border-4 border-mint-400 px-3 py-1 text-xl font-extrabold text-mint-400"
            >
              LIKE
            </motion.div>
            <motion.div
              style={{ opacity: passOpacity }}
              className="pointer-events-none absolute right-5 top-6 z-10 rotate-[12deg] rounded-lg border-4 border-ember-400 px-3 py-1 text-xl font-extrabold text-ember-400"
            >
              PASS
            </motion.div>
          </>
        )}

        <div className="relative h-[68%] w-full bg-ink-700">
          {title.posterUrl ? (
            <img src={title.posterUrl} alt={title.name} className="h-full w-full object-cover" draggable={false} />
          ) : (
            <div className="flex h-full items-center justify-center text-4xl">🎬</div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-ink-800 to-transparent" />
          <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-bold text-yellow-400 backdrop-blur">
            ★ {title.rating.toFixed(1)}
          </span>
        </div>

        <div className="flex flex-1 flex-col px-5 py-4">
          <h2 className="text-xl font-bold leading-tight">{title.name}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-white/50">
            {title.year && <span>{title.year}</span>}
            {runtime && <span>· {runtime}</span>}
            <span>· {title.mediaType === "tv" ? "Series" : "Movie"}</span>
            {title.genres.slice(0, 2).map((g) => (
              <span key={g} className="rounded-full bg-white/10 px-2 py-0.5">
                {g}
              </span>
            ))}
          </div>
          <p className="mt-2 line-clamp-3 text-sm text-white/70">{title.synopsis}</p>
        </div>
      </div>
    </motion.div>
  );
}
