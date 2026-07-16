import { Suspense } from "react"
import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono, IBM_Plex_Sans_Arabic } from "next/font/google"
import { headers } from "next/headers"

import "./globals.css"
import { AppSidebar } from "@/components/app-sidebar"
import { CuelumeProvider } from "@/components/cuelume-provider"
import { PlatformAppShell } from "@/components/platform-app-shell"
import { PlatformNavbar } from "@/components/platform-navbar"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { WorkspaceProvider } from "@/lib/workspace-context"
import { cn } from "@/lib/utils"

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

const fontArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
})

export const metadata: Metadata = {
  metadataBase: new URL("https://atmetai.com"),
  title: {
    default: "Atmet",
    template: "%s | Atmet",
  },
  description:
    "Atmet helps teams build AI coworker agents that understand workflows, connect apps, and run business work safely.",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      {
        url: "/faciconatmet.png",
        type: "image/png",
      },
    ],
    shortcut: "/faciconatmet.png",
    apple: [
      {
        url: "/faciconatmet.png",
        type: "image/png",
      },
    ],
  },
  openGraph: {
    type: "website",
    url: "https://atmetai.com",
    siteName: "Atmet",
    title: "Atmet",
    description:
      "Build AI coworker agents that understand workflows, connect apps, and run business work safely with Atmet.",
    images: [
      {
        url: "/Atmet%20Preview%20Link.png",
        width: 1200,
        height: 630,
        alt: "Atmet preview",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Atmet",
    description:
      "Build AI coworker agents that understand workflows, connect apps, and run business work safely with Atmet.",
    images: ["/Atmet%20Preview%20Link.png"],
  },
}

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#131313" },
  ],
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const isPublicShell = (await headers()).get("x-atmet-public-shell") === "true"

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(
        "antialiased",
        fontMono.variable,
        fontSans.variable,
        fontArabic.variable,
        "font-sans"
      )}
    >
      <body>
        <ThemeProvider>
          {isPublicShell ? (
            children
          ) : (
            <>
              <CuelumeProvider />
              <WorkspaceProvider>
                <TooltipProvider>
                  <PlatformAppShell>
                    <SidebarProvider
                      defaultOpen={false}
                      className="h-full min-h-0"
                    >
                      <Suspense fallback={null}>
                        <AppSidebar />
                      </Suspense>
                      <SidebarInset className="h-full overflow-y-auto rounded-xl border border-border/80 bg-background bg-clip-padding shadow-[0_24px_90px_rgba(0,0,0,0.14)] peer-data-[state=expanded]:-ml-px peer-data-[state=expanded]:rounded-l-none peer-data-[state=expanded]:!border-l-0 peer-data-[state=expanded]:shadow-[18px_24px_90px_rgba(0,0,0,0.12)] dark:bg-sidebar dark:shadow-[0_24px_90px_rgba(0,0,0,0.46)] dark:peer-data-[state=expanded]:shadow-[18px_24px_90px_rgba(0,0,0,0.38)]">
                        <Suspense
                          fallback={
                            <div className="h-10 border-b border-border" />
                          }
                        >
                          <PlatformNavbar />
                        </Suspense>
                        {children}
                      </SidebarInset>
                    </SidebarProvider>
                  </PlatformAppShell>
                </TooltipProvider>
              </WorkspaceProvider>
            </>
          )}
        </ThemeProvider>
      </body>
    </html>
  )
}
