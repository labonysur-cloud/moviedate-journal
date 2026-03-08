import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { FilmReelIcon } from "@/components/icons/CinemaIcons";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <FilmReelIcon className="w-16 h-16" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return <>{children}</>;
}
