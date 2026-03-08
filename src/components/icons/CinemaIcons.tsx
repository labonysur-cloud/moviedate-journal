import { motion } from "framer-motion";

export function PopcornIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <motion.svg
      viewBox="0 0 64 64"
      className={className}
      initial={{ rotate: -5 }}
      animate={{ rotate: [-5, 5, -5] }}
      transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
    >
      <rect x="16" y="28" width="32" height="30" rx="4" fill="hsl(var(--accent))" stroke="hsl(var(--foreground))" strokeWidth="2" />
      <rect x="18" y="52" width="28" height="4" rx="2" fill="hsl(var(--primary))" opacity="0.3" />
      {/* Popcorn kernels */}
      <circle cx="24" cy="22" r="6" fill="hsl(var(--secondary))" stroke="hsl(var(--foreground))" strokeWidth="1.5" />
      <circle cx="32" cy="18" r="7" fill="hsl(var(--secondary))" stroke="hsl(var(--foreground))" strokeWidth="1.5" />
      <circle cx="40" cy="22" r="6" fill="hsl(var(--secondary))" stroke="hsl(var(--foreground))" strokeWidth="1.5" />
      <circle cx="28" cy="24" r="5" fill="hsl(var(--gold))" stroke="hsl(var(--foreground))" strokeWidth="1.5" />
      <circle cx="36" cy="24" r="5" fill="hsl(var(--gold))" stroke="hsl(var(--foreground))" strokeWidth="1.5" />
      {/* Stripes on bucket */}
      <line x1="22" y1="28" x2="22" y2="58" stroke="hsl(var(--primary))" strokeWidth="2" opacity="0.4" />
      <line x1="32" y1="28" x2="32" y2="58" stroke="hsl(var(--primary))" strokeWidth="2" opacity="0.4" />
      <line x1="42" y1="28" x2="42" y2="58" stroke="hsl(var(--primary))" strokeWidth="2" opacity="0.4" />
    </motion.svg>
  );
}

export function TicketStubIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <motion.svg
      viewBox="0 0 64 64"
      className={className}
      animate={{ y: [0, -3, 0] }}
      transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
    >
      <rect x="6" y="16" width="52" height="32" rx="6" fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth="2" />
      <line x1="42" y1="16" x2="42" y2="48" stroke="hsl(var(--primary))" strokeWidth="2" strokeDasharray="4 3" />
      <rect x="12" y="22" width="24" height="4" rx="2" fill="hsl(var(--primary))" opacity="0.7" />
      <rect x="12" y="30" width="18" height="3" rx="1.5" fill="hsl(var(--muted-foreground))" opacity="0.4" />
      <rect x="12" y="37" width="14" height="3" rx="1.5" fill="hsl(var(--muted-foreground))" opacity="0.3" />
      <circle cx="50" cy="28" r="3" fill="hsl(var(--accent))" />
      <circle cx="50" cy="38" r="2" fill="hsl(var(--accent))" opacity="0.6" />
    </motion.svg>
  );
}

export function FilmReelIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <motion.svg
      viewBox="0 0 64 64"
      className={className}
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
    >
      <circle cx="32" cy="32" r="26" fill="none" stroke="hsl(var(--foreground))" strokeWidth="2" />
      <circle cx="32" cy="32" r="22" fill="hsl(var(--card))" stroke="hsl(var(--foreground))" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="6" fill="hsl(var(--primary))" />
      {/* Sprocket holes */}
      <circle cx="32" cy="14" r="3" fill="hsl(var(--muted))" stroke="hsl(var(--foreground))" strokeWidth="1" />
      <circle cx="32" cy="50" r="3" fill="hsl(var(--muted))" stroke="hsl(var(--foreground))" strokeWidth="1" />
      <circle cx="14" cy="32" r="3" fill="hsl(var(--muted))" stroke="hsl(var(--foreground))" strokeWidth="1" />
      <circle cx="50" cy="32" r="3" fill="hsl(var(--muted))" stroke="hsl(var(--foreground))" strokeWidth="1" />
      <circle cx="19" cy="19" r="3" fill="hsl(var(--muted))" stroke="hsl(var(--foreground))" strokeWidth="1" />
      <circle cx="45" cy="19" r="3" fill="hsl(var(--muted))" stroke="hsl(var(--foreground))" strokeWidth="1" />
      <circle cx="19" cy="45" r="3" fill="hsl(var(--muted))" stroke="hsl(var(--foreground))" strokeWidth="1" />
      <circle cx="45" cy="45" r="3" fill="hsl(var(--muted))" stroke="hsl(var(--foreground))" strokeWidth="1" />
    </motion.svg>
  );
}

export function HeartSparkleIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <motion.svg
      viewBox="0 0 64 64"
      className={className}
      animate={{ scale: [1, 1.1, 1] }}
      transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
    >
      <path
        d="M32 52 C32 52 10 38 10 24 C10 16 16 10 24 10 C28 10 31 12 32 16 C33 12 36 10 40 10 C48 10 54 16 54 24 C54 38 32 52 32 52Z"
        fill="hsl(var(--primary))"
        stroke="hsl(var(--foreground))"
        strokeWidth="2"
      />
      {/* Sparkles */}
      <motion.g
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
      >
        <polygon points="48,8 49,12 53,13 49,14 48,18 47,14 43,13 47,12" fill="hsl(var(--accent))" />
        <polygon points="14,6 15,9 18,10 15,11 14,14 13,11 10,10 13,9" fill="hsl(var(--accent))" />
      </motion.g>
    </motion.svg>
  );
}

export function StarBurstIcon({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <motion.svg
      viewBox="0 0 32 32"
      className={className}
      animate={{ rotate: [0, 15, 0, -15, 0], scale: [1, 1.1, 1] }}
      transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
    >
      <polygon
        points="16,2 19,12 30,12 21,19 24,30 16,23 8,30 11,19 2,12 13,12"
        fill="hsl(var(--accent))"
        stroke="hsl(var(--foreground))"
        strokeWidth="1"
      />
    </motion.svg>
  );
}

export function ClapperboardIcon({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <motion.svg viewBox="0 0 64 64" className={className}>
      {/* Board body */}
      <rect x="8" y="24" width="48" height="32" rx="4" fill="hsl(var(--card))" stroke="hsl(var(--foreground))" strokeWidth="2" />
      {/* Clapper top */}
      <motion.g
        style={{ transformOrigin: "8px 24px" }}
        animate={{ rotate: [0, -15, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut", repeatDelay: 2 }}
      >
        <rect x="8" y="12" width="48" height="14" rx="3" fill="hsl(var(--primary))" stroke="hsl(var(--foreground))" strokeWidth="2" />
        {/* Stripes */}
        <rect x="16" y="12" width="6" height="14" fill="hsl(var(--primary-foreground))" opacity="0.3" />
        <rect x="28" y="12" width="6" height="14" fill="hsl(var(--primary-foreground))" opacity="0.3" />
        <rect x="40" y="12" width="6" height="14" fill="hsl(var(--primary-foreground))" opacity="0.3" />
      </motion.g>
      {/* Text lines */}
      <rect x="14" y="32" width="20" height="3" rx="1.5" fill="hsl(var(--muted-foreground))" opacity="0.4" />
      <rect x="14" y="39" width="14" height="3" rx="1.5" fill="hsl(var(--muted-foreground))" opacity="0.3" />
      <rect x="14" y="46" width="18" height="3" rx="1.5" fill="hsl(var(--muted-foreground))" opacity="0.25" />
    </motion.svg>
  );
}
