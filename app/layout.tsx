import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' })

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://otouri-app.vercel.app'

export const metadata: Metadata = {
  title: 'عطوري - التطبيق التعليمي',
  description: 'بوابة التفعيل الرسمية لتطبيق عطوري — شراء الترخيص وتجديد الاشتراك عبر Chargily Pay بالبطاقة الذهبية أو CIB.',
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
  openGraph: {
    title: 'عطوري - التطبيق التعليمي',
    description: 'بوابة التفعيل الرسمية لتطبيق عطوري — شراء وتفعيل فوري بالبطاقة الذهبية أو CIB.',
    url: APP_URL,
    siteName: 'عطوري - Otouri',
    locale: 'ar_DZ',
    type: 'website',
  },
  other: {
    'google': 'notranslate',
  },
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ar" dir="rtl" className={`${geist.variable} ${geistMono.variable} bg-background notranslate`} translate="no">
      <head>
        <meta name="google" content="notranslate" />
      </head>
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
