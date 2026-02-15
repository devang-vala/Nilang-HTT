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
import { MapPin, Compass, ClipboardList, Loader2, Sparkles, Users } from "lucide-react";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState("stall");
  const { data: user, isLoading } = useCurrentUser();
  const router = useRouter();

  // Client-side auth guard
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-linear-to-br from-blue-50 via-white to-purple-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
          <p className="text-sm text-slate-600 font-medium">Loading your workspace...</p>
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
      gradient: "from-blue-500 to-cyan-500",
      bgGradient: "from-blue-50 to-cyan-50",
      iconBg: "bg-linear-to-br from-blue-500 to-cyan-600",
    },
    {
      id: "field",
      icon: Compass,
      label: "Field",
      title: "Field Mode",
      description: "Quick capture from on-floor networking",
      gradient: "from-purple-500 to-pink-500",
      bgGradient: "from-purple-50 to-pink-50",
      iconBg: "bg-linear-to-br from-purple-500 to-pink-600",
    },
    {
      id: "contacts",
      icon: ClipboardList,
      label: "Contacts",
      title: "Contact List",
      description: "View and manage captured leads",
      gradient: "from-emerald-500 to-teal-500",
      bgGradient: "from-emerald-50 to-teal-50",
      iconBg: "bg-linear-to-br from-emerald-500 to-teal-600",
    },
  ];

  const activeMode = modes.find((m) => m.id === activeTab) || modes[0];

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-white to-blue-50/30">
      <Navbar />
      <SyncStatusBar />
      <PWAInstallPrompt />

      {/* Enhanced Mobile-First Header */}
      <header className="pt-4 pb-3 px-4 sm:px-6 sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-slate-200/60 shadow-sm">
        <div className="max-w-2xl mx-auto">
          {/* User Welcome Card */}
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-linear-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Users className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm text-slate-500 font-medium">Welcome back,</p>
              <h1 className="text-base sm:text-lg font-bold text-slate-900 truncate">
                {user.name || "User"}
              </h1>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-linear-to-r from-blue-50 to-purple-50 rounded-full border border-blue-200/50">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              <span className="text-xs font-semibold text-blue-700">Conference Lead Capture</span>
            </div>
          </div>

          {/* Desktop Tabs - Hidden on mobile */}
          <div className="hidden sm:block">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full h-14 bg-linear-to-r from-slate-100 to-slate-50 p-1.5 rounded-xl border border-slate-200/60 shadow-sm">
                {modes.map((mode) => (
                  <TabsTrigger
                    key={mode.id}
                    value={mode.id}
                    className="flex-1 rounded-lg text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-slate-900 data-[state=active]:shadow-md transition-all duration-200 h-full"
                  >
                    <mode.icon className="h-4 w-4 mr-2" />
                    {mode.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Mobile Mode Indicator */}
          <div className="sm:hidden flex items-center justify-center gap-2 py-2">
            <div className={`w-8 h-8 rounded-lg ${activeMode.iconBg} flex items-center justify-center shadow-md`}>
              <activeMode.icon className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900">{activeMode.title}</p>
              <p className="text-xs text-slate-500 truncate">{activeMode.description}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area - Mobile First */}
      <main className="px-3 sm:px-6 py-4 sm:py-6 pb-20 sm:pb-8">
        <div className="max-w-2xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {/* Stall Mode */}
            <TabsContent value="stall" className="mt-0">
              <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 overflow-hidden">
                <div className={`bg-linear-to-r ${activeMode.bgGradient} px-4 sm:px-6 py-4 border-b border-blue-200/50`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${activeMode.iconBg} flex items-center justify-center shadow-md`}>
                      <MapPin className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900">
                        Stall Mode
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-600">
                        Capture visitor details at your booth
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-4 sm:p-6">
                  <StallForm />
                </div>
              </div>
            </TabsContent>

            {/* Field Mode */}
            <TabsContent value="field" className="mt-0">
              <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 overflow-hidden">
                <div className={`bg-linear-to-r ${modes[1].bgGradient} px-4 sm:px-6 py-4 border-b border-emerald-200/50`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${modes[1].iconBg} flex items-center justify-center shadow-md`}>
                      <Compass className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900">
                        Field Mode
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-600">
                        Quick capture from on-floor networking
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-4 sm:p-6">
                  <FieldForm />
                </div>
              </div>
            </TabsContent>

            {/* Contacts */}
            <TabsContent value="contacts" className="mt-0">
              <div className="bg-white rounded-2xl shadow-lg border border-slate-200/60 overflow-hidden">
                <div className={`bg-linear-to-r ${modes[2].bgGradient} px-4 sm:px-6 py-4 border-b border-emerald-200/50`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl ${modes[2].iconBg} flex items-center justify-center shadow-md`}>
                      <ClipboardList className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900">
                        Contact List
                      </h2>
                      <p className="text-xs sm:text-sm text-slate-600">
                        View and manage captured leads
                      </p>
                    </div>
                  </div>
                </div>
                <div className="p-0">
                  <ContactList isActive={activeTab === "contacts"} />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      {/* Enhanced Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-200/60 sm:hidden z-40 shadow-2xl">
        <div className="safe-area-inset-bottom">
          <div className="grid grid-cols-3 h-16 px-2">
            {modes.map((mode) => {
              const isActive = activeTab === mode.id;
              return (
                <button
                  key={mode.id}
                  onClick={() => setActiveTab(mode.id)}
                  className={`flex flex-col items-center justify-center gap-1 transition-all duration-200 rounded-xl mx-1 my-2 ${
                    isActive
                      ? `bg-linear-to-br ${mode.bgGradient} shadow-md scale-105`
                      : "hover:bg-slate-50"
                  }`}
                >
                  <div className={`${isActive ? mode.iconBg : "bg-slate-200"} p-1.5 rounded-lg transition-all duration-200`}>
                    <mode.icon className={`h-4 w-4 ${isActive ? "text-white" : "text-slate-500"}`} />
                  </div>
                  <span className={`text-[10px] font-semibold transition-colors ${
                    isActive ? "text-slate-900" : "text-slate-500"
                  }`}>
                    {mode.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}