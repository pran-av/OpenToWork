import type { Metadata } from 'next';
import { Inter, Comic_Neue } from 'next/font/google';
import './globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

const comicNeue = Comic_Neue({ 
  weight: '700',
  subsets: ['latin'],
  variable: '--font-comic-neue',
});

export const metadata: Metadata = {
  title: 'Elevator Pitch App',
  description: 'Create your own elevator pitch in minutes',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${comicNeue.variable}`}>
        {children}
      </body>
    </html>
  );
}