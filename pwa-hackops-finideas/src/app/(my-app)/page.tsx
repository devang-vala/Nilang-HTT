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

  // Client-side auth guard (middleware handles the redirect, this is a safety net)
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!user) {
    router.push("/auth");
    return null;
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 to-white">
      <Navbar />
      <SyncStatusBar />
      <PWAInstallPrompt />

      {/* Header — compact for mobile */}
      <header className="pt-6 pb-4 px-4 sm:px-6">
        <div className="max-w-lg mx-auto">
          <div className="mb-1">
            <p className="text-xs text-slate-500">
              Welcome, <span className="font-medium text-slate-700">{user.name}</span> — Conference Lead Capture
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 sm:px-6 pb-8">
        <div className="max-w-lg mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-3 w-full h-12 bg-slate-100 p-1 rounded-lg mb-4">
              <TabsTrigger
                value="stall"
                className="rounded-md text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all"
              >
                <MapPin className="h-3.5 w-3.5 sm:mr-1" />
                <span className="hidden sm:inline">Stall</span>
              </TabsTrigger>
              <TabsTrigger
                value="field"
                className="rounded-md text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all"
              >
                <Compass className="h-3.5 w-3.5 sm:mr-1" />
                <span className="hidden sm:inline">Field</span>
              </TabsTrigger>
              <TabsTrigger
                value="contacts"
                className="rounded-md text-xs font-medium data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-sm transition-all"
              >
                <ClipboardList className="h-3.5 w-3.5 sm:mr-1" />
                <span className="hidden sm:inline">Contacts</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="stall" className="mt-0">
              <div className="bg-white border border-slate-100 rounded-lg p-5 shadow-sm">
                <div className="mb-4">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Stall Mode
                  </h2>
                  <p className="text-xs text-slate-500">
                    Capture visitor details at the booth
                  </p>
                </div>
                <StallForm />
              </div>
            </TabsContent>

            <TabsContent value="field" className="mt-0">
              <div className="bg-white border border-slate-100 rounded-lg p-5 shadow-sm">
                <div className="mb-4">
                  <h2 className="text-sm font-semibold text-slate-900">
                    Field Mode
                  </h2>
                  <p className="text-xs text-slate-500">
                    Quick capture from on-floor networking
                  </p>
                </div>
                <FieldForm />
              </div>
            </TabsContent>

            <TabsContent value="contacts" className="mt-0">
              <ContactList isActive={activeTab === "contacts"} />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Mobile Bottom Nav — visible on small screens */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 sm:hidden z-40 safe-area-inset-bottom">
        <div className="grid grid-cols-3 h-16">
          {[
            { id: "stall", icon: MapPin, label: "Stall" },
            { id: "field", icon: Compass, label: "Field" },
            { id: "contacts", icon: ClipboardList, label: "Contacts" },
          ].map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex flex-col items-center justify-center gap-0.5 transition-colors
                ${
                  activeTab === id
                    ? "text-slate-900"
                    : "text-slate-400 hover:text-slate-600"
                }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-medium">{label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}