"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ConfettiOverlay } from "./ConfettiOverlay";
import { Button } from "./Button";
import { MatchResult } from "@/types";
import { X, Sparkles } from "lucide-react";

interface MatchCelebrationProps {
  matches: MatchResult[];
  onDismiss: () => void;
}

function playChime() {
  if (typeof window === "undefined") return;
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

    // First tone
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.value = 523.25; // C5
    gain1.gain.setValueAtTime(0.3, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.5);

    // Second tone (higher, slight delay)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.value = 659.25; // E5
    gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.7);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.15);
    osc2.stop(ctx.currentTime + 0.7);

    // Third tone (even higher, completes the chord)
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = "sine";
    osc3.frequency.value = 783.99; // G5
    gain3.gain.setValueAtTime(0.25, ctx.currentTime + 0.3);
    gain3.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 1.0);
    osc3.connect(gain3);
    gain3.connect(ctx.destination);
    osc3.start(ctx.currentTime + 0.3);
    osc3.stop(ctx.currentTime + 1.0);

    // Cleanup
    setTimeout(() => ctx.close(), 1500);
  } catch {
    // Audio not available — no-op
  }
}

export function MatchCelebration({ matches, onDismiss }: MatchCelebrationProps) {
  const router = useRouter();
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    playChime();

    const timer = setTimeout(() => {
      onDismiss();
    }, 8000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  const handleViewMatches = useCallback(() => {
    onDismiss();
    router.push("/matches");
  }, [onDismiss, router]);

  return (
    <>
      <ConfettiOverlay trigger={showConfetti} onComplete={() => setShowConfetti(false)} />

      {/* Modal overlay */}
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="relative mx-4 w-full max-w-md rounded-2xl bg-card border border-border p-6 shadow-xl animate-in fade-in zoom-in-95 duration-300">
          {/* Close button */}
          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 text-muted hover:text-foreground transition-colors"
            aria-label="Dismiss"
          >
            <X size={20} />
          </button>

          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/10 mb-4">
              <Sparkles size={32} className="text-accent" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              {matches.length === 1 ? "New Match Found!" : `${matches.length} New Matches!`}
            </h2>
            <p className="text-sm text-muted mt-1">
              We found spaces that match your needs
            </p>
          </div>

          {/* Match list */}
          <div className="space-y-3 mb-6 max-h-48 overflow-y-auto">
            {matches.slice(0, 5).map((match, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-lg bg-background border border-border"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">
                    {match.post.title}
                  </p>
                  <p className="text-xs text-muted">
                    by {match.post.authorName}
                  </p>
                </div>
                <div className="ml-3 text-right shrink-0">
                  <span className="text-sm font-semibold text-accent">
                    {match.score} pts
                  </span>
                  <p className="text-xs text-muted">
                    {match.matchingAttributes.length} attrs
                  </p>
                </div>
              </div>
            ))}
            {matches.length > 5 && (
              <p className="text-xs text-muted text-center">
                +{matches.length - 5} more matches
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="ghost"
              className="flex-1"
              onClick={onDismiss}
            >
              Dismiss
            </Button>
            <Button
              className="flex-1"
              onClick={handleViewMatches}
            >
              View Matches
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
