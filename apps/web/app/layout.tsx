import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import { Playfair_Display } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

import "./globals.css";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Casaora — The operating system for property management",
    template: "%s | Casaora",
  },
  description:
    "Casaora is the all-in-one platform for property owners, managers, guests, and tenants. Streamline operations, automate workflows, and grow your portfolio.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://casaora.co"
  ),
  openGraph: {
    type: "website",
    siteName: "Casaora",
    locale: "en_US",
  },
  icons: {
    icon: "/fav.svg",
    apple: "/fav.svg",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      className={`${GeistSans.variable} ${GeistMono.variable} ${playfair.variable}`}
      lang="en"
      suppressHydrationWarning
    >
      <body className="font-sans antialiased" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          disableTransitionOnChange
          enableSystem
        >
          {children}
          <Toaster closeButton position="top-right" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
