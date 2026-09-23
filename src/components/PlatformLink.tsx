import type { Platform } from "../lib/types";

const TYPE_LABEL: Record<string, string> = {
  subscription: "Stream",
  stream: "Watch",
  free: "Free",
  rent: "Rent",
  buy: "Buy",
  addon: "Add-on",
};

export function PlatformLink({ platform }: { platform: Platform }) {
  return (
    <a
      href={platform.link || "#"}
      target="_blank"
      rel="noreferrer"
      className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 transition-colors hover:border-glow-400/60 hover:bg-white/10"
    >
      <div className="flex items-center gap-3">
        {platform.logo ? (
          <img src={platform.logo} alt="" className="h-8 w-8 rounded-lg object-cover" />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-sm">▶</div>
        )}
        <span className="font-semibold">{platform.service}</span>
      </div>
      <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-white/60">
        {TYPE_LABEL[platform.type] ?? platform.type}
      </span>
    </a>
  );
}
