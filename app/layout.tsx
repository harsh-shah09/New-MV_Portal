import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import { Toaster } from 'sonner'
import './globals.css'

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL!),
  title: {
    default: 'MV Portal',
    template: '%s | MV Portal',
  },

  description: 'MV Portal - Manage employees, HR operations, and business workflows efficiently with MVClouds.',

  keywords: [
    'HR Portal',
    'Employee Management',
    'MV Portal',
    'HR Software India',
    'Employee Dashboard',
    'Business Management Tool'
  ],

  authors: [{ name: 'MVClouds', url: 'https://mvclouds.com' }],
  creator: 'MVClouds',
  publisher: 'MVClouds',

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  openGraph: {
    title: 'MV Portal',
    description: 'Powerful HR & Employee Management Portal by MVClouds.',
    url: process.env.NEXT_PUBLIC_APP_URL!,
    siteName: 'MV Portal',
    images: [
      {
        url: '/mv_logo1.png',
        width: 1200,
        height: 630,
        alt: 'MV Portal',
      },
    ],
    locale: 'en_IN',
    type: 'website',
  },

  twitter: {
    card: 'summary_large_image',
    title: 'MV Portal',
    description: 'Smart HR & Employee Management System.',
    images: ['/mv_logo1.png'],
  },

  icons: {
    icon: '/mv_logo1.png',
    apple: '/apple-icon.png',
  },

  alternates: {
    canonical: process.env.NEXT_PUBLIC_APP_URL!,
  },

  category: 'technology',
}

import AntdStyledRegistry from '@/components/AntdStyledRegistry'
import Providers from './providers'
import { AppLayout } from '@/components/app-layout'
import ActivityProvider from './ActivityProvider'
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${geist.variable} ${geistMono.variable} font-sans antialiased`}>
        <AntdStyledRegistry>
        <ActivityProvider>
          <Providers>
            <AppLayout>{children}</AppLayout>
          </Providers>
        </ActivityProvider>
        </AntdStyledRegistry>
        <Toaster position="top-right" richColors closeButton expand={true} />
      </body>
    </html>
  )
}