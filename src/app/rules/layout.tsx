import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Rules | 像素众创',
  description: 'Community rules and guidelines for participation.',

  openGraph: {
    title: 'Rules | 像素众创',
    description: 'Community rules and guidelines for participation.',
    siteName: '像素众创',
    images: [
      {
        url: '/huangshan.png',
        width: 1200,
        height: 630,
        alt: 'Community rules and guidelines for participation.',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Rules | 像素众创',
    description: 'Community rules and guidelines for participation.',
    images: ['/huangshan.png'],
    creator: '@julienbrg',
  },
}

export default function RulesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
