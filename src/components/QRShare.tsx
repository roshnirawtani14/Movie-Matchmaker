import { useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";

export function QRShare({ url }: { url: string }) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [shareError, setShareError] = useState<string | null>(null);

  function getCanvas(): HTMLCanvasElement | null {
    return canvasRef.current?.querySelector("canvas") ?? null;
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function handleShareImage() {
    setShareError(null);
    const canvas = getCanvas();
    if (!canvas) return;

    canvas.toBlob(async (blob) => {
      if (!blob) return;
      const file = new File([blob], "movie-night-invite.png", { type: "image/png" });

      try {
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: "Movie Night",
            text: "Scan this to pick tonight's movie with me 🎬",
          });
          return;
        }
        if (navigator.share) {
          await navigator.share({ title: "Movie Night", text: "Pick tonight's movie with me", url });
          return;
        }
        throw new Error("no-share-api");
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return;
        setShareError("Sharing isn't supported here — use Copy Link instead.");
      }
    }, "image/png");
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div ref={canvasRef} className="rounded-2xl bg-white p-4 shadow-xl shadow-black/30">
        <QRCodeCanvas value={url} size={200} level="M" />
      </div>

      <div className="flex w-full gap-2">
        <button
          type="button"
          onClick={handleShareImage}
          className="flex-1 rounded-xl bg-gradient-to-r from-ember-500 to-glow-500 py-2.5 text-sm font-semibold text-white active:scale-95"
        >
          Share QR
        </button>
        <button
          type="button"
          onClick={handleCopyLink}
          className="flex-1 rounded-xl border border-white/15 bg-white/5 py-2.5 text-sm font-semibold text-white/85 active:scale-95"
        >
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>
      {shareError && <p className="text-xs text-white/40">{shareError}</p>}
    </div>
  );
}
