'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, MessageSquare, BookOpen,
  Users, Scale, Bot, Activity, ChevronRight
} from 'lucide-react'
import { clsx } from 'clsx'

const nav = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Chats', href: '/chat', icon: MessageSquare },
  { label: 'Corpus RAG', href: '/corpus', icon: BookOpen },
  { label: 'Usuarios', href: '/users', icon: Users },
  { label: 'Abogados', href: '/lawyers', icon: Scale },
  { label: 'Agentes', href: '/team', icon: Bot },
]

export default function Sidebar() {
  const path = usePathname()

  return (
    <aside className="w-60 min-h-screen bg-gray-950 border-r border-gray-800 flex flex-col">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-rimai-800 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">R</span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm">RimAI</p>
            <p className="text-gray-500 text-xs">Management</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(({ label, href, icon: Icon }) => {
          const active = path === href || (href !== '/' && path.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors group',
                active
                  ? 'bg-rimai-900 text-rimai-300 font-medium'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
              )}
            >
              <Icon size={16} className={active ? 'text-rimai-400' : 'text-gray-500 group-hover:text-gray-300'} />
              {label}
              {active && <ChevronRight size={12} className="ml-auto text-rimai-500" />}
            </Link>
          )
        })}
      </nav>

      {/* Status */}
      <div className="px-5 py-4 border-t border-gray-800">
        <div className="flex items-center gap-2">
          <Activity size={12} className="text-green-400" />
          <span className="text-xs text-gray-500">API Online</span>
        </div>
        <p className="text-xs text-gray-600 mt-1 truncate">railway.app</p>
      </div>
    </aside>
  )
}
