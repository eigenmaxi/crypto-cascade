import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Crypto Cascade',
  description: 'Crypto-themed puzzle game with cascading combos',
  other: {
    'fc:frame': 'vNext',
    'fc:frame:image': 'https://your-domain.com/og-image.png',
    'fc:frame:button:1': 'Play Crypto Cascade',
    'fc:frame:button:1:action': 'link',
    'fc:frame:button:1:target': 'https://your-domain.com',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}