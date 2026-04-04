import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'RimAI Dashboard',
  description: 'Panel de gestión — RimAI LegalTech Ecuador',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
