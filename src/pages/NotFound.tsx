import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Film, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <Film className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
        <h1 className="mb-2 text-5xl font-display font-bold text-foreground">404</h1>
        <p className="mb-6 text-lg text-muted-foreground">This scene doesn't exist in our movie 🎬</p>
        <Button variant="warm" asChild>
          <Link to="/">
            <Home className="w-4 h-4 mr-1" />
            Back to Home
          </Link>
        </Button>
      </div>
    </div>
  );
};

export default NotFound;
