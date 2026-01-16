import type { Metadata } from "next";
import Script from "next/script";
import { Poppins, Inter, Comic_Neue } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pitch Like This",
  description: "We specialize in selling your skills.",
  openGraph: {
    title: "Pitch Like This",
    description: "Create tailored pitches for every role or client, organise your projects and case studies, and share them as clean, distraction-free links that tell your story with clarity and impact.",
    url: "https://www.pitchlikethis.com",
    siteName: "Pitch Like This",
    images: [
      {
        url: "https://www.pitchlikethis.com/og_image.png",
        width: 1200,
        height: 630,
        alt: "Pitch Like This",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pitch Like This",
    description: "Create tailored pitches for every role or client, organise your projects and case studies, and share them as clean, distraction-free links that tell your story with clarity and impact.",
    images: ["https://www.pitchlikethis.com/og_image.png"],
  },
  alternates: {
    canonical: "https://www.pitchlikethis.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-title" content="Pitch Like This" />
      </head>
      <body
        className={`${poppins.variable} ${inter.variable} antialiased`}
      >
        {/* Google tag (gtag.js) */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-7BW3L8CRHB"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-7BW3L8CRHB');
          `}
        </Script>
        {children}
        <SpeedInsights />
      </body>
    </html>
  );
}
