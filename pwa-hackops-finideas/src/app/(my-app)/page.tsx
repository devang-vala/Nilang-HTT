"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCurrentUser } from "@/hooks/use-auth";
import StallForm from "@/components/StallForm";
import FieldForm from "@/components/FieldForm";
import ContactList from "@/components/ContactList";
import Navbar from "@/components/navbar";
import SyncStatusBar from "@/components/SyncStatusBar";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Compass, ClipboardList, Loader2 } from "lucide-react";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("stall");
  const { data: user, isLoading } = useCurrentUser();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-foreground" />
          <p className="text-sm text-muted-foreground font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    router.push("/auth");
    return null;
  }

  const modes = [
    {
      id: "stall",
      icon: MapPin,
      label: "Stall",
      title: "Stall Mode",
      description: "Capture visitor details at your booth",
    },
    {
      id: "field",
      icon: Compass,
      label: "Field",
      title: "Field Mode",
      description: "Quick capture from on-floor networking",
    },
    {
      id: "contacts",
      icon: ClipboardList,
      label: "Contacts",
      title: "Contact List",
      description: "View and manage captured leads",
    },
  ];

  const activeMode = modes.find((m) => m.id === activeTab) || modes[0];

  return (
    <div className="min-h-screen bg-background">
      <SyncStatusBar />
      <div className="h-10 shrink-0" aria-hidden />
      <Navbar />
      <PWAInstallPrompt />

      {/* Hero Card */}
      <div className="px-4 pt-5 pb-4">
        <div className="max-w-2xl mx-auto">
          <div className="bg-foreground rounded-2xl p-5 text-background">
            <div className="flex items-center justify-between mb-4">
              <p className="text-background/60 text-xs font-medium uppercase tracking-wider">Welcome back</p>
              <div className="h-8 w-8 rounded-full bg-background/10 flex items-center justify-center">
                <span className="text-background text-xs font-bold">
                  {(user.name || "U").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)}
                </span>
              </div>
            </div>
            <h1 className="text-xl font-bold text-background mb-1 text-balance">
              {user.name || "User"}
            </h1>
            <p className="text-background/50 text-xs">Conference Lead Capture</p>
          </div>
        </div>
      </div>


      {/* Desktop Tabs - Hidden on mobile */}
      <div className="hidden sm:block px-4 pb-2">
        <div className="max-w-2xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full h-12 bg-muted p-1 rounded-xl">
              {modes.map((mode) => (
                <TabsTrigger
                  key={mode.id}
                  value={mode.id}
                  className="flex-1 rounded-lg text-sm font-medium data-[state=active]:bg-card data-[state=active]:text-foreground data-[state=active]:shadow-sm transition-all h-full"
                >
                  <mode.icon className="h-4 w-4 mr-2" />
                  {mode.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Active mode indicator */}
      <div className="px-4 pb-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="w-1 h-8 bg-foreground rounded-full" />
          <div>
            <p className="text-sm font-semibold text-foreground">{activeMode.title}</p>
            <p className="text-xs text-muted-foreground">{activeMode.description}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="px-4 pb-24 sm:pb-8">
        <div className="max-w-2xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsContent value="stall" className="mt-0">
              <div className="bg-card rounded-2xl border border-border overflow-hidden">
                <div className="p-5">
                  <StallForm />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="field" className="mt-0">
              <div className="bg-card rounded-2xl border border-border overflow-hidden">
                <div className="p-5">
                  <FieldForm />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="contacts" className="mt-0">
              <div className="bg-card rounded-2xl border border-border overflow-hidden">
                <div className="p-4">
                  <ContactList isActive={activeTab === "contacts"} />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border sm:hidden z-40">
        <div className="safe-area-inset-bottom">
          <div className="grid grid-cols-3 h-16 px-4">
            {modes.map((mode) => {
              const isActive = activeTab === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => setActiveTab(mode.id)}
                  className="flex flex-col items-center justify-center gap-1 transition-all"
                >
                  <mode.icon
                    className={`h-5 w-5 transition-colors ${
                      isActive ? "text-foreground" : "text-muted-foreground"
                    }`}
                  />
                  <span
                    className={`text-[10px] font-medium transition-colors ${
                      isActive ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {mode.label}
                  </span>
                  {isActive && (
                    <div className="w-1 h-1 rounded-full bg-foreground" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
