import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { Monitor, Cpu, CalendarDays, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { path: '/', label: '首页', icon: Monitor, matchPrefix: '' },
  { path: '/devices', label: '设备', icon: Cpu, matchPrefix: '/devices' },
  { path: '/reservations', label: '预约', icon: CalendarDays, matchPrefix: '/reservations' },
  { path: '/queue', label: '排队', icon: Users, matchPrefix: '/queue' },
]

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()

  const isActive = (tab: typeof tabs[number]) => {
    if (tab.path === '/') return location.pathname === '/'
    return location.pathname.startsWith(tab.matchPrefix)
  }

  return (
    <div className="flex flex-col min-h-screen bg-space">
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-cyan/10 bg-space-card/95 backdrop-blur-lg">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
          {tabs.map((tab) => {
            const active = isActive(tab)
            const Icon = tab.icon
            return (
              <button
                key={tab.path}
                onClick={() => navigate(tab.path)}
                className={cn(
                  'flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-all duration-300 min-w-[64px]',
                  active
                    ? 'text-cyan shadow-neon-cyan'
                    : 'text-gray-500 hover:text-gray-300'
                )}
              >
                <Icon className={cn('w-5 h-5', active && 'animate-glow')} />
                <span className={cn('text-xs', active && 'font-orbitron font-semibold')}>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
