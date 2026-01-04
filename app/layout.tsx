import type { Metadata } from "next";
import Script from "next/script";
import { Poppins, Inter, Comic_Neue } from "next/font/google";
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
  description: "We expertise in selling your skills.",
  icons: {
    icon: [
      {
        url: "/pitchlikethis-logo.svg",
        type: "image/svg+xml",
      },
    ],
    shortcut: "/pitchlikethis-logo.svg",
    apple: "/pitchlikethis-logo.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
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
      </body>
    </html>
  );
}
