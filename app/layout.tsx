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
  title: "Elevator Pitch App",
  description: "create shareable link for your pitch",
  icons: {
    icon: [
      {
        url: "/tardis_elevator_icon_refined_3d.webp",
        type: "image/webp",
      },
      {
        url: "/tardis_elevator_icon_refined_3d.png",
        type: "image/png",
      },
    ],
    shortcut: "/tardis_elevator_icon_refined_3d.png",
    apple: "/tardis_elevator_icon_refined_3d.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
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
