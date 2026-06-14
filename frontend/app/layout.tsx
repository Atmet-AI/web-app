import { Suspense } from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"

import "./globals.css"
import { AppSidebar } from "@/components/app-sidebar"
import { PlatformNavbar } from "@/components/platform-navbar"
import { ThemeProvider } from "@/components/theme-provider"
import { TooltipProvider } from "@/components/ui/tooltip"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
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
  icons: {
    icon: "/Logos/Favicon%20Atmet.png",
    shortcut: "/Logos/Favicon%20Atmet.png",
    apple: "/Logos/Favicon%20Atmet.png",
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
        </ThemeProvider>
      </body>
    </html>
  )
}
