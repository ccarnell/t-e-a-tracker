import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Analytics } from "@vercel/analytics/next"


export const metadata: Metadata = {
  metadataBase: new URL('https://liminalist.ai'),
  title: "TEA Tracker - Track your Time, Energy & Attention",
  description: "Minimalist web app to track your time, energy, and attention patterns for better productivity and self-awareness.",
  openGraph: {
    title: "TEA Tracker - Track your Time, Energy & Attention",
    description: "Minimalist web app to track your time, energy, and attention patterns.",
    url: 'https://liminalist.ai',
    siteName: 'Liminalist',
    images: [
      {
        url: '/t-e-a-opengraph-image.png',
        width: 1200,
        height: 630,
        alt: 'TEA Tracker - Track your Time, Energy & Attention',
      }
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "TEA Tracker - Track your Time, Energy & Attention",
    description: "Minimalist web app to track your time, energy, and attention patterns.",
    images: ['/t-e-a-opengraph-image.png'],
  },
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  display: "swap",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
          <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={`${geistSans.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          forcedTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
