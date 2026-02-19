"use client";

import { useEffect, useCallback } from "react";
import confetti from "canvas-confetti";

interface ConfettiOverlayProps {
  trigger: boolean;
  onComplete?: () => void;
}

export function ConfettiOverlay({ trigger, onComplete }: ConfettiOverlayProps) {
  const fireConfetti = useCallback(() => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const colors = ["#A8DADC", "#457B9D", "#1D3557", "#F1FAEE"];

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min;
    };

    const interval = window.setInterval(() => {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        clearInterval(interval);
        onComplete?.();
        return;
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti({
        particleCount,
        startVelocity: 30,
        spread: 360,
        origin: {
          x: randomInRange(0.1, 0.3),
          y: Math.random() - 0.2,
        },
        colors,
      });
      confetti({
        particleCount,
        startVelocity: 30,
        spread: 360,
        origin: {
          x: randomInRange(0.7, 0.9),
          y: Math.random() - 0.2,
        },
        colors,
      });
    }, 250);

    return () => clearInterval(interval);
  }, [onComplete]);

  useEffect(() => {
    if (trigger) {
      const cleanup = fireConfetti();
      return cleanup;
    }
  }, [trigger, fireConfetti]);

  return null;
}
