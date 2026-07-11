import { Suspense } from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"

import "./globals.css"
import { AppSidebar } from "@/components/app-sidebar"
import { CuelumeProvider } from "@/components/cuelume-provider"
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

export const metadata: Metadata = {
  metadataBase: new URL("https://atmetai.com"),
  title: {
    default: "Atmet",
    template: "%s | Atmet",
  },
  description: "Atmet helps teams build, automate, and operate AI-powered workflows.",
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
    description: "Build, automate, and operate AI-powered workflows with Atmet.",
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
    description: "Build, automate, and operate AI-powered workflows with Atmet.",
    images: ["/Atmet%20Preview%20Link.png"],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", fontSans.variable)}
    >
      <body>
        <ThemeProvider>
          <CuelumeProvider />
          <WorkspaceProvider>
          <TooltipProvider>
            <SidebarProvider>
              <Suspense fallback={null}>
                <AppSidebar />
              </Suspense>
              <SidebarInset className="h-screen overflow-y-auto">
                <Suspense fallback={<div className="h-10 border-b border-border" />}>
                  <PlatformNavbar />
                </Suspense>
                {children}
              </SidebarInset>
            </SidebarProvider>
          </TooltipProvider>
          </WorkspaceProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
