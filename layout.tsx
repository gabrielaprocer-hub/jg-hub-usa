import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'JG Hub USA — Seu concierge de compras nos EUA',
  description: 'Compre nos Estados Unidos e receba no Brasil com acompanhamento em tempo real, transparência total e experiência premium.',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-[#FAFAFA]">{children}</body>
    </html>
  )
}
