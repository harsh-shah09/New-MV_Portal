import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import { Toaster } from 'sonner'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'MV Portal',
  description: 'Created with MVClouds',
  generator: 'mvclouds.com',
  icons: {
    icon: [
      {
        url: '/mv_logo1.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/mv_logo1.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/mv_logo1.png',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

import AntdStyledRegistry from '@/components/AntdStyledRegistry';
import Providers from './providers';
import { AppLayout } from '@/components/app-layout';

// ...

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans antialiased`}>
        <AntdStyledRegistry>
          <Providers>
            <AppLayout>{children}</AppLayout>
          </Providers>
        </AntdStyledRegistry>
        <Toaster position="top-right" richColors closeButton expand={true} />
      </body>
    </html>
  )
}
