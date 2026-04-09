import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Calendar, Users, UserCog, Stethoscope, LogOut, X } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import clsx from 'clsx'
import logo from '@/images/Dental appointment made easy.png'

const navItems = [
  { to: '/dashboard',        label: 'Dashboard',         icon: LayoutDashboard, roles: ['admin', 'doctor', 'receptionist'] },
  { to: '/appointments',     label: 'Appointments',      icon: Calendar,        roles: ['admin', 'doctor', 'receptionist'] },
  { to: '/patients',         label: 'Patients',          icon: Users,           roles: ['admin', 'doctor', 'receptionist'] },
  { to: '/treatment-types',  label: 'Treatment Types',   icon: Stethoscope,     roles: ['admin'] },
  { to: '/users',            label: 'Users',             icon: UserCog,         roles: ['admin'] },
]

const ROLE_BADGE: Record<string, string> = {
  admin:        'bg-primary-100 text-primary-700',
  doctor:       'bg-blue-100 text-blue-700',
  receptionist: 'bg-purple-100 text-purple-700',
}

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const { user, logout } = useAuthStore()

  return (
    <aside className="h-full w-60 bg-white border-r border-gray-100 flex flex-col shadow-sm">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src={logo} alt="DentEase" className="h-14 w-auto" />
          <span className="text-lg font-bold text-primary-700 leading-none">DentEase</span>
        </div>
        {/* Close button (mobile only) */}
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1 text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems
          .filter(({ roles }) => roles.includes(user?.role ?? ''))
          .map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              onClick={onClose}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-700 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={16} className={isActive ? 'text-primary-600' : 'text-gray-400'} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
      </nav>

      {/* User / Logout */}
      <div className="px-4 py-4 border-t border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
            <span className="text-primary-700 font-semibold text-sm">
              {user?.name?.charAt(0)?.toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 truncate">{user?.name}</p>
            <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded font-medium capitalize ${ROLE_BADGE[user?.role ?? ''] ?? 'bg-gray-100 text-gray-600'}`}>
              {user?.role}
            </span>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 text-xs text-gray-500 hover:text-red-600 transition-colors w-full"
        >
          <LogOut size={13} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
