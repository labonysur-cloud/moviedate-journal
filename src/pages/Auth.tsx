import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { PopcornIcon, FilmReelIcon, HeartSparkleIcon, ClapperboardIcon, StarBurstIcon } from "@/components/icons/CinemaIcons";
import { Loader2 } from "lucide-react";

export default function Auth() {
  const { user, loading } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgot, setIsForgot] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { toast } = useToast();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <FilmReelIcon className="w-16 h-16" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({ title: "Enter your email", description: "We need your email to send a reset link", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast({
        title: "Check your email ✉️",
        description: "We sent you a password reset link!",
      });
    } catch (err: any) {
      toast({ title: "Oops!", description: err.message || "Something went wrong", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isForgot) return handleForgotPassword(e);
    if (!email.trim() || !password.trim()) return;
    setSubmitting(true);

    try {
      if (isSignUp) {
        if (password.length < 6) {
          toast({ title: "Password too short", description: "Please use at least 6 characters", variant: "destructive" });
          return;
        }
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: displayName.trim() || undefined },
          },
        });
        if (error) {
          if (error.message?.includes("rate") || error.status === 429) {
            throw new Error("Too many attempts. Please wait a moment and try again.");
          }
          throw error;
        }
        toast({ title: "Check your email ✉️", description: "We sent you a confirmation link to get started!" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          if (error.message === "Invalid login credentials") {
            throw new Error("Wrong email or password. Please try again.");
          }
          throw error;
        }
      }
    } catch (err: any) {
      toast({ title: "Oops!", description: err.message || "Something went wrong", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (error) {
        toast({
          title: "Google sign-in failed",
          description: error.message || "Please try again",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Google sign-in failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-8 bg-background relative overflow-hidden">
      {/* Floating decorative icons - hidden on very small screens */}
      <motion.div
        className="absolute top-12 left-8 sm:left-20 opacity-20 hidden sm:block"
        animate={{ y: [0, -15, 0], rotate: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
      >
        <PopcornIcon className="w-16 h-16 sm:w-24 sm:h-24" />
      </motion.div>
      <motion.div
        className="absolute bottom-20 right-8 sm:right-20 opacity-20 hidden sm:block"
        animate={{ y: [0, 10, 0], rotate: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 6, ease: "easeInOut", delay: 1 }}
      >
        <ClapperboardIcon className="w-14 h-14 sm:w-20 sm:h-20" />
      </motion.div>
      <motion.div
        className="absolute top-1/3 right-12 opacity-15 hidden md:block"
        animate={{ scale: [1, 1.2, 1], rotate: [0, 20, 0] }}
        transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
      >
        <StarBurstIcon className="w-10 h-10" />
      </motion.div>

      {/* Main card */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-sm sm:max-w-md"
      >
        <div className="bg-card border border-border rounded-2xl sm:rounded-3xl p-6 sm:p-8 shadow-xl relative">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="flex justify-center mb-3 sm:mb-4">
              <HeartSparkleIcon className="w-12 h-12 sm:w-14 sm:h-14" />
            </div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-1.5 sm:mb-2">
              Cozy Cinema
            </h1>
            <p className="text-muted-foreground text-xs sm:text-sm">
              {isForgot
                ? "Enter your email and we'll send a reset link"
                : isSignUp
                ? "Create your account to start watching"
                : "Welcome back, movie lover"}
            </p>
          </div>

          {/* Google button - hide during forgot password */}
          {!isForgot && (
            <>
              <Button
                variant="outline"
                className="w-full h-11 sm:h-12 rounded-xl text-sm font-medium mb-5 sm:mb-6 border-2 hover:border-primary/30 transition-all"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
              >
                {googleLoading ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                )}
                Continue with Google
              </Button>

              <div className="flex items-center gap-3 mb-5 sm:mb-6">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-border" />
              </div>
            </>
          )}

          {/* Form */}
          <form onSubmit={handleEmailAuth} className="space-y-3 sm:space-y-4">
            <AnimatePresence mode="wait">
              {isSignUp && !isForgot && (
                <motion.div
                  key="name"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Label htmlFor="displayName" className="text-foreground text-sm">
                    Display name
                  </Label>
                  <Input
                    id="displayName"
                    placeholder="Movie Lover"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="mt-1.5 rounded-xl h-11"
                    autoComplete="name"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <Label htmlFor="email" className="text-foreground text-sm">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1.5 rounded-xl h-11"
                autoComplete="email"
                inputMode="email"
              />
            </div>

            {!isForgot && (
              <div>
                <Label htmlFor="password" className="text-foreground text-sm">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="At least 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="mt-1.5 rounded-xl h-11"
                  autoComplete={isSignUp ? "new-password" : "current-password"}
                />
              </div>
            )}

            {!isSignUp && !isForgot && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => setIsForgot(true)}
                  className="text-xs text-primary hover:underline"
                >
                  Forgot password?
                </button>
              </div>
            )}

            <Button
              type="submit"
              variant="warm"
              className="w-full h-11 sm:h-12 rounded-xl text-sm sm:text-base"
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isForgot ? (
                "Send Reset Link"
              ) : isSignUp ? (
                "Create Account"
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          {/* Toggle */}
          <p className="text-center text-xs sm:text-sm text-muted-foreground mt-5 sm:mt-6">
            {isForgot ? (
              <button
                type="button"
                onClick={() => setIsForgot(false)}
                className="text-primary font-semibold hover:underline"
              >
                ← Back to Sign In
              </button>
            ) : (
              <>
                {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-primary font-semibold hover:underline"
                >
                  {isSignUp ? "Sign in" : "Create one"}
                </button>
              </>
            )}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
