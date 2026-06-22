import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import { Toaster } from 'sonner'
import './globals.css'

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })

import { getAdminSettingValue } from '@/lib/admin-settings';

export async function generateMetadata(): Promise<Metadata> {
  const appUrl = await getAdminSettingValue('NEXT_PUBLIC_APP_URL') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  return {
    metadataBase: new URL(appUrl),
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
      url: appUrl,
      siteName: 'MV Portal',
      images: [
        {
          url: '/mv_logo_new.png',
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
      images: ['/mv_logo_new.png'],
    },

    icons: {
      icon: '/favicon.ico',
      apple: '/favicon.ico',
    },

    alternates: {
      canonical: appUrl,
    },

    category: 'technology',
  };
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
        <noscript>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100vw', backgroundColor: '#f8d7da', color: '#721c24', position: 'fixed', top: 0, left: 0, zIndex: 9999 }}>
            <h1 style={{ fontSize: '2rem', marginBottom: '1rem', fontWeight: 'bold' }}>JavaScript is Disabled</h1>
            <p style={{ fontSize: '1.25rem' }}>Please enable JavaScript in your browser settings to use this application.</p>
          </div>
        </noscript>
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