import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'SentinelX – AI-Powered Industrial Asset Intelligence',
    template: '%s | SentinelX',
  },
  description:
    'SentinelX is an AI-powered industrial asset intelligence platform. Predict failures, prevent downtime, and prolong asset life.',
  keywords: ['industrial IoT', 'predictive maintenance', 'asset management', 'SentinelX'],
  authors: [{ name: 'SentinelX Team' }],
  robots: 'index, follow',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
