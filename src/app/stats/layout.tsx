import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Stats | 像素众创',
  description: 'Statistics and insights about the collective pixel artwork.',

  openGraph: {
    title: 'Stats | 像素众创',
    description: 'Statistics and insights about the collective pixel artwork.',
    siteName: '像素众创',
    images: [
      {
        url: '/huangshan.png',
        width: 1200,
        height: 630,
        alt: 'Statistics and insights about the collective pixel artwork.',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Stats | 像素众创',
    description: 'Statistics and insights about the collective pixel artwork.',
    images: ['/huangshan.png'],
    creator: '@julienbrg',
  },
}

export default function StatsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
