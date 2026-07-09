import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://parametric-03.iverfinne.no'),
  title: 'Parametric Studio — iverfinne.no',
  description:
    'An interactive studio for parametric 3D forms — every design a point in one parameter space.',
  openGraph: {
    title: 'Parametric Studio',
    description:
      'An interactive studio for parametric 3D forms — every design a point in one parameter space.',
    url: 'https://parametric-03.iverfinne.no',
    siteName: 'Parametric Studio',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Parametric Studio',
    description:
      'An interactive studio for parametric 3D forms — every design a point in one parameter space.',
  },
  generator: 'v0.app',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Parametric Studio',
  },
  applicationName: 'Parametric Studio',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#000000' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="overflow-hidden antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
