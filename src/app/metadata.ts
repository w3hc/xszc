import { Metadata } from 'next'

export const metadata: Metadata = {
  metadataBase: new URL('https://pixel.w3hc.org'),

  title: '像素众创',
  description: 'Collective Pixel Artwork',

  keywords: ['像素众创', 'xszc', 'w3pk', 'WebAuthn', 'Next.js', 'Web3', 'Ethereum'],
  authors: [{ name: 'W3HC', url: 'https://github.com/w3hc' }],

  openGraph: {
    title: '像素众创',
    description: 'Collective Pixel Artwork',
    siteName: '像素众创',
    images: [
      {
        url: '/huangshan.png',
        width: 1200,
        height: 630,
        alt: 'Collective Pixel Artwork',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },

  twitter: {
    card: 'summary_large_image',
    title: '像素众创',
    description: 'Collective Pixel Artwork',
    images: ['/huangshan.png'],
    creator: '@julienbrg',
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },

  verification: {
    google: 'your-google-site-verification',
  },
}
