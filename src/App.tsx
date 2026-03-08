import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import PageTransition from "@/components/PageTransition";
import Navbar from "@/components/Navbar";
import Index from "./pages/Index";
import Watch from "./pages/Watch";
import Movies from "./pages/Movies";
import Tickets from "./pages/Tickets";
import Journal from "./pages/Journal";
import Friends from "./pages/Friends";
import Profile from "./pages/Profile";
import WatchRoom from "./pages/WatchRoom";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/auth" element={<PageTransition><Auth /></PageTransition>} />
        <Route path="/reset-password" element={<PageTransition><ResetPassword /></PageTransition>} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Navbar />
              <AnimatePresence mode="wait">
                <Routes location={location} key={location.pathname}>
                  <Route path="/" element={<PageTransition><Index /></PageTransition>} />
                  <Route path="/movies" element={<PageTransition><Movies /></PageTransition>} />
                  <Route path="/watch" element={<PageTransition><Watch /></PageTransition>} />
                  <Route path="/tickets" element={<PageTransition><Tickets /></PageTransition>} />
                  <Route path="/journal" element={<PageTransition><Journal /></PageTransition>} />
                  <Route path="/friends" element={<PageTransition><Friends /></PageTransition>} />
                  <Route path="/profile" element={<PageTransition><Profile /></PageTransition>} />
                  <Route path="/watch-together" element={<PageTransition><WatchRoom /></PageTransition>} />
                  <Route path="*" element={<PageTransition><NotFound /></PageTransition>} />
                </Routes>
              </AnimatePresence>
            </ProtectedRoute>
          }
        />
      </Routes>
    </AnimatePresence>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AnimatedRoutes />
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
