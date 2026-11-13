import './globals.css'

export const metadata = {
  title: 'nhue: a new hue, a new you',
  description:
    'Personal color analysis. Take front, left and right photos and see the three colors that suit your skin tone, held right under your own face.',
}

export const viewport = { width: 'device-width', initialScale: 1, themeColor: '#E3C3BF' }

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,300..800&family=Newsreader:ital,opsz,wght@0,6..72,400..600;1,6..72,400..500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
