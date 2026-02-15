import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import QueryProvider from "@/providers/query-provider";
import OCRInitializer from "@/components/OCRInitializer";
import RecordingSyncInitializer from "@/components/RecordingSyncInitializer";
import ContactSyncInitializer from "@/components/ContactSyncInitializer";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#FAFAFA",
};

export const metadata: Metadata = {
  title: "Finideas Connect",
  description: "Offline-first conference lead capture system for Finideas",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Finideas Connect",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/icon-192x192.png" },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="hydrated">
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body
        className={`${inter.variable} font-sans antialiased bg-background text-foreground`}
      >
        <QueryProvider>
          <OCRInitializer />
          <RecordingSyncInitializer />
          <ContactSyncInitializer />
          <ServiceWorkerRegistrar />
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}

// Client component to register service worker
function ServiceWorkerRegistrar() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').then(
                function(registration) {
                  console.log('SW registered: ', registration.scope);
                },
                function(err) {
                  console.log('SW registration failed: ', err);
                }
              );
            });
          }
        `,
      }}
    />
  );
}
