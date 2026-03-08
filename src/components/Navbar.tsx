import { Link, useLocation } from "react-router-dom";
import { Film, Ticket, BookHeart, Home, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { StarBurstIcon } from "@/components/icons/CinemaIcons";

const links = [
  { to: "/", label: "Home", icon: Home },
  { to: "/movies", label: "Movies", icon: Film },
  { to: "/tickets", label: "Tickets", icon: Ticket },
  { to: "/journal", label: "Journal", icon: BookHeart },
  { to: "/friends", label: "Friends", icon: Users },
];

export default function Navbar() {
  const location = useLocation();
  const { user, signOut } = useAuth();

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
      <div className="container mx-auto px-4 flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2 group">
          <StarBurstIcon className="w-5 h-5" />
          <span className="font-display text-xl font-bold text-foreground">
            Cozy Cinema
          </span>
        </Link>
        <div className="flex items-center gap-1">
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                location.pathname === to
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{label}</span>
            </Link>
          ))}
          {user && (
            <Button
              variant="ghost"
              size="sm"
              onClick={signOut}
              className="ml-2 text-muted-foreground text-xs"
            >
              Sign out
            </Button>
          )}
        </div>
      </div>
    </nav>
  );
}
