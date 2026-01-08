import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'DAO | 像素众创',
  description: 'Decentralized autonomous organization governance and participation.',

  openGraph: {
    title: 'DAO | 像素众创',
    description: 'Decentralized autonomous organization governance and participation.',
    siteName: '像素众创',
    images: [
      {
        url: '/huangshan.png',
        width: 1200,
        height: 630,
        alt: 'Decentralized autonomous organization governance and participation.',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },

  twitter: {
    card: 'summary_large_image',
    title: 'DAO | 像素众创',
    description: 'Decentralized autonomous organization governance and participation.',
    images: ['/huangshan.png'],
    creator: '@julienbrg',
  },
}

export default function DaoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
