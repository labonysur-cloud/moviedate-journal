import { motion } from "framer-motion";

export type ReactionKey =
  | "love" | "like" | "dislike" | "wow" | "sad"
  | "cry" | "happy" | "laugh" | "care" | "angry";

type StampDef = {
  key: ReactionKey;
  label: string;
  color: string;          // text/border
  bg: string;             // fill behind label
  draw: (s: number) => JSX.Element; // inline SVG art at size s
};

// Cute mini illustrations rendered as inline SVG (no emoji).
// All paths are simple, hand-drawn-feeling — they read as little movie-ticket stamps.
const path = (d: string, props: React.SVGProps<SVGPathElement> = {}) => (
  <path d={d} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} {...props} />
);

export const REACTIONS: StampDef[] = [
  {
    key: "love",
    label: "Love",
    color: "#b3284a",
    bg: "#fde7ec",
    draw: (s) => (
      <svg viewBox="0 0 24 24" width={s} height={s} stroke="currentColor">
        {path("M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z", { fill: "currentColor", fillOpacity: 0.15 })}
      </svg>
    ),
  },
  {
    key: "like",
    label: "Like",
    color: "#7a4a1f",
    bg: "#fbeed4",
    draw: (s) => (
      <svg viewBox="0 0 24 24" width={s} height={s} stroke="currentColor">
        {path("M7 11v9H4v-9h3zm3 9V11l4-7c1.5 0 2.5 1 2.5 2.5L15.5 10H20a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 18.8 20H10z")}
      </svg>
    ),
  },
  {
    key: "dislike",
    label: "Nope",
    color: "#4b4b6b",
    bg: "#e7e7ef",
    draw: (s) => (
      <svg viewBox="0 0 24 24" width={s} height={s} stroke="currentColor">
        {path("M7 13V4h3v9H7zm3-9v9l4 7c1.5 0 2.5-1 2.5-2.5L15.5 14H20a2 2 0 0 0 2-2.3l-1.2-6A2 2 0 0 0 18.8 4H10z")}
      </svg>
    ),
  },
  {
    key: "wow",
    label: "Wow",
    color: "#7a3aa8",
    bg: "#efe1f7",
    draw: (s) => (
      <svg viewBox="0 0 24 24" width={s} height={s} stroke="currentColor">
        {path("M12 2v3M4.2 5.2l2.1 2.1M2 12h3M19.8 5.2l-2.1 2.1M22 12h-3")}
        {path("M9 14a3 3 0 1 0 6 0v-1a3 3 0 0 0-6 0v1z", { fill: "currentColor", fillOpacity: 0.15 })}
      </svg>
    ),
  },
  {
    key: "sad",
    label: "Sad",
    color: "#2f5a8a",
    bg: "#dfeaf6",
    draw: (s) => (
      <svg viewBox="0 0 24 24" width={s} height={s} stroke="currentColor">
        {path("M5 11a7 7 0 1 1 14 0v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6z")}
        {path("M9 11h.01M15 11h.01M9 16c1-1 5-1 6 0", { strokeWidth: 2 })}
      </svg>
    ),
  },
  {
    key: "cry",
    label: "Cry",
    color: "#1f6ea8",
    bg: "#dbecf7",
    draw: (s) => (
      <svg viewBox="0 0 24 24" width={s} height={s} stroke="currentColor">
        {path("M5 10a7 7 0 1 1 14 0v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6z")}
        {path("M9 10v2M15 10v2M9 16c1-1 5-1 6 0", { strokeWidth: 2 })}
        {path("M8 15c-1 2-1 3 0 4s2-2 0-4zM16 15c1 2 1 3 0 4s-2-2 0-4z", { fill: "currentColor", fillOpacity: 0.4 })}
      </svg>
    ),
  },
  {
    key: "happy",
    label: "Happy",
    color: "#b8861b",
    bg: "#fbecc1",
    draw: (s) => (
      <svg viewBox="0 0 24 24" width={s} height={s} stroke="currentColor">
        <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity={0.12} />
        {path("M9 10h.01M15 10h.01M8.5 14c1.5 2 5.5 2 7 0", { strokeWidth: 2 })}
      </svg>
    ),
  },
  {
    key: "laugh",
    label: "Laugh",
    color: "#c7711a",
    bg: "#fde2c4",
    draw: (s) => (
      <svg viewBox="0 0 24 24" width={s} height={s} stroke="currentColor">
        <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity={0.12} />
        {path("M8 10l2 1-2 1M16 10l-2 1 2 1")}
        {path("M7 13c1 3 4 4 5 4s4-1 5-4H7z", { fill: "currentColor", fillOpacity: 0.25 })}
      </svg>
    ),
  },
  {
    key: "care",
    label: "Care",
    color: "#c43f6e",
    bg: "#fde0ea",
    draw: (s) => (
      <svg viewBox="0 0 24 24" width={s} height={s} stroke="currentColor">
        {path("M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z", { fill: "currentColor", fillOpacity: 0.18 })}
        {path("M8 9c1-2 4-3 6-2.5M16 9c-1-2-4-3-6-2.5")}
      </svg>
    ),
  },
  {
    key: "angry",
    label: "Angry",
    color: "#b03020",
    bg: "#fbded7",
    draw: (s) => (
      <svg viewBox="0 0 24 24" width={s} height={s} stroke="currentColor">
        <circle cx="12" cy="12" r="9" fill="currentColor" fillOpacity={0.12} />
        {path("M7 9l3 1-3 1M17 9l-3 1 3 1")}
        {path("M8.5 16c1.5-1.5 5.5-1.5 7 0", { strokeWidth: 2 })}
      </svg>
    ),
  },
];

export const REACTION_MAP: Record<ReactionKey, StampDef> =
  REACTIONS.reduce((m, r) => ({ ...m, [r.key]: r }), {} as Record<ReactionKey, StampDef>);

interface StampProps {
  reaction: ReactionKey;
  size?: number;
  withLabel?: boolean;
  active?: boolean;
  onClick?: () => void;
  count?: number;
  title?: string;
}

/** Vintage ticket-stamp button for a single reaction. */
export function ReactionStamp({
  reaction, size = 22, withLabel = false, active, onClick, count, title,
}: StampProps) {
  const r = REACTION_MAP[reaction];
  return (
    <motion.button
      type="button"
      title={title ?? r.label}
      whileHover={{ y: -2, rotate: -2 }}
      whileTap={{ scale: 0.9, rotate: 4 }}
      onClick={onClick}
      style={{
        color: r.color,
        background: active ? r.bg : "transparent",
        borderColor: r.color,
      }}
      className={`relative inline-flex items-center gap-1.5 px-2 py-1 rounded-md border-2 border-dashed
        font-handwritten text-sm transition-all
        ${active ? "shadow-[2px_2px_0_0_currentColor]" : "opacity-80 hover:opacity-100"}
      `}
    >
      <span aria-hidden className="leading-none">{r.draw(size)}</span>
      {withLabel && <span className="leading-none">{r.label}</span>}
      {typeof count === "number" && count > 0 && (
        <span className="leading-none text-xs font-body font-bold">{count}</span>
      )}
    </motion.button>
  );
}

/** Picker palette of all 10 stamps. */
export function ReactionPicker({
  selected, onPick,
}: { selected?: ReactionKey | null; onPick: (r: ReactionKey | null) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5 p-2 rounded-2xl bg-card border border-border shadow-lg">
      {REACTIONS.map((r) => (
        <ReactionStamp
          key={r.key}
          reaction={r.key}
          withLabel
          active={selected === r.key}
          onClick={() => onPick(selected === r.key ? null : r.key)}
        />
      ))}
    </div>
  );
}
