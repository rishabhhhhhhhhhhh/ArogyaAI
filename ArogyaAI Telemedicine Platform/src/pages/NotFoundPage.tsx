import { Link } from "react-router-dom";
import { Home, Search, Brain } from "lucide-react";
import { Button } from "../components/ui/button";
import { GlassCard } from "../components/GlassCard";

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-destructive/10" />
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-destructive/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-2xl text-center">
        <GlassCard glow="teal" className="space-y-6">
          {/* Animated Icon */}
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl pulse-glow" />
            <div className="relative p-8 rounded-full bg-primary/10 border-2 border-primary/20">
              <Brain className="w-24 h-24 text-primary" />
            </div>
          </div>

          {/* 404 Error */}
          <div className="space-y-2">
            <h1 className="text-8xl font-['Poppins'] font-semibold text-primary glow-teal">
              404
            </h1>
            <h2 className="text-3xl font-['Poppins'] font-semibold">
              We couldn't diagnose this page
            </h2>
            <p className="text-xl text-muted-foreground max-w-md mx-auto">
              The page you're looking for seems to have taken an
              unauthorized medical leave.
            </p>
          </div>

          {/* Suggestions */}
          <div className="space-y-3 pt-6">
            <p className="text-sm text-muted-foreground">
              Here's what you can do:
            </p>
            <div className="grid md:grid-cols-2 gap-3">
              <Link to="/" className="block">
                <Button
                  variant="outline"
                  className="w-full border-primary/20 hover:bg-primary/10 group"
                >
                  <Home className="w-4 h-4 mr-2 group-hover:text-primary transition-colors" />
                  Go Home
                </Button>
              </Link>
              <Link to="/ai-demo" className="block">
                <Button className="w-full bg-primary hover:bg-primary/90 glow-teal group">
                  <Brain className="w-4 h-4 mr-2" />
                  Try AI Demo
                </Button>
              </Link>
            </div>
          </div>

          {/* Additional Help */}
          <div className="pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground mb-3">
              Still can't find what you're looking for?
            </p>
            <div className="flex items-center justify-center gap-2">
              <Search className="w-4 h-4 text-muted-foreground" />
              <a
                href="#"
                className="text-primary hover:underline"
              >
                Search our help center
              </a>
            </div>
          </div>
        </GlassCard>

        {/* Fun Medical Stats */}
        <div className="mt-8 grid grid-cols-3 gap-4 opacity-50">
          <div className="text-center">
            <p className="text-2xl font-['Poppins'] font-semibold text-primary">
              99.9%
            </p>
            <p className="text-xs text-muted-foreground">
              Pages Working
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-['Poppins'] font-semibold text-accent">
              24/7
            </p>
            <p className="text-xs text-muted-foreground">
              AI Available
            </p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-['Poppins'] font-semibold text-[#23C4F8]">
              {"< 2s"}
            </p>
            <p className="text-xs text-muted-foreground">
              Response Time
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}