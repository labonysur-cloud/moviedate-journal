import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const rows = [
  { label: "A", seats: 8, offset: 2 },
  { label: "B", seats: 10, offset: 1 },
  { label: "C", seats: 12, offset: 0 },
  { label: "D", seats: 12, offset: 0 },
  { label: "E", seats: 10, offset: 1 },
  { label: "F", seats: 8, offset: 2 },
];

interface SeatPickerProps {
  selectedSeats: string[];
  onSelect: (seats: string[]) => void;
  bookedSeats?: string[];
}

export default function SeatPicker({ selectedSeats, onSelect, bookedSeats = [] }: SeatPickerProps) {
  const toggleSeat = (seatId: string) => {
    if (selectedSeats.includes(seatId)) {
      onSelect(selectedSeats.filter((s) => s !== seatId));
    } else {
      onSelect([...selectedSeats, seatId]);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Screen */}
      <div className="relative w-full max-w-[320px] mb-4">
        <div className="h-8 bg-gradient-to-b from-accent/40 to-transparent rounded-t-[100%] flex items-center justify-center">
          <span className="text-[10px] uppercase tracking-[0.3em] text-accent-foreground/60 font-semibold">Screen</span>
        </div>
        <div className="h-1 bg-accent/30 rounded-b-lg" />
      </div>

      {/* Seats */}
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-1">
          <span className="w-5 text-[10px] font-bold text-muted-foreground text-right">{row.label}</span>
          <div className="flex gap-1" style={{ paddingLeft: `${row.offset * 20}px`, paddingRight: `${row.offset * 20}px` }}>
            {Array.from({ length: row.seats }, (_, i) => {
              const seatId = `${row.label}${i + 1}`;
              const isBooked = bookedSeats.includes(seatId);
              const isSelected = selectedSeats.includes(seatId);
              const isVip = row.label === "F";

              return (
                <motion.button
                  key={seatId}
                  whileHover={!isBooked ? { scale: 1.2 } : {}}
                  whileTap={!isBooked ? { scale: 0.9 } : {}}
                  onClick={() => !isBooked && toggleSeat(seatId)}
                  disabled={isBooked}
                  className={cn(
                    "w-7 h-7 rounded-t-lg text-[9px] font-bold transition-all border-b-2",
                    isBooked && "bg-muted/50 text-muted-foreground/30 border-muted cursor-not-allowed",
                    isSelected && "bg-accent text-accent-foreground border-accent shadow-md shadow-accent/30",
                    !isBooked && !isSelected && isVip && "bg-rose/30 text-rose-foreground border-rose/50 hover:bg-rose/50",
                    !isBooked && !isSelected && !isVip && "bg-card text-muted-foreground border-border hover:bg-secondary hover:border-accent"
                  )}
                  title={seatId}
                >
                  {i + 1}
                </motion.button>
              );
            })}
          </div>
          <span className="w-5 text-[10px] font-bold text-muted-foreground">{row.label}</span>
        </div>
      ))}

      {/* Selected count */}
      {selectedSeats.length > 0 && (
        <p className="text-xs text-accent font-semibold mt-1">
          {selectedSeats.length} seat{selectedSeats.length > 1 ? "s" : ""} selected: {selectedSeats.join(", ")}
        </p>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-t-md bg-card border border-border" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-t-md bg-accent" />
          <span>Selected</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-t-md bg-rose/30 border border-rose/50" />
          <span>VIP</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded-t-md bg-muted/50" />
          <span>Taken</span>
        </div>
      </div>
    </div>
  );
}
