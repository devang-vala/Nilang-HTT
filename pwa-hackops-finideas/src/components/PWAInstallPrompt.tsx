"use client";

import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<{ outcome: "accepted" | "dismissed" }>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const isStandalone =
      typeof window !== "undefined" &&
      (window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone ===
          true);
    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
      setDeferredPrompt(null);
    }
  };

  const dismiss = () => {
    setShowBanner(false);
  };

  if (isInstalled || !showBanner || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 sm:bottom-4 sm:left-auto sm:right-4 sm:max-w-sm animate-in slide-in-from-bottom-4">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-lg">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground">
          <span className="text-background text-sm font-bold">F</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            Install Finideas
          </p>
          <p className="text-xs text-muted-foreground">
            Add to home screen for quick access
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            size="sm"
            onClick={handleInstall}
            className="gap-1.5 rounded-xl bg-foreground text-background hover:bg-foreground/90"
          >
            <Download className="h-3.5 w-3.5" />
            Install
          </Button>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
