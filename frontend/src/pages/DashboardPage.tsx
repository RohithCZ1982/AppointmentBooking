import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/api'
import type { DashboardStats } from '@/types'
import { Calendar, CheckCircle, Users, Clock } from 'lucide-react'
import { format } from 'date-fns'
import logo from '@/images/Dental appointment made easy.png'

const STATUS_COLORS: Record<string, string> = {
  scheduled:   'bg-blue-100 text-blue-700',
  confirmed:   'bg-indigo-100 text-indigo-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed:   'bg-green-100 text-green-700',
  cancelled:   'bg-red-100 text-red-600',
  no_show:     'bg-gray-100 text-gray-500',
}

function StatCard({ label, value, icon: Icon, gradient }: {
  label: string; value: number; icon: React.ElementType; gradient: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
      <div className={`p-3 rounded-xl ${gradient} shadow-sm`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const today = new Date()

  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardApi.stats().then((r) => r.data),
  })

  const { data: todayAppts } = useQuery({
    queryKey: ['today-appointments'],
    queryFn: () => dashboardApi.todayAppointments().then((r) => r.data.data),
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Good morning 👋</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {format(today, 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <img src={logo} alt="DentEase" className="h-16 w-auto" />
          <span className="text-xl font-bold text-primary-700">DentEase</span>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard label="Today's Appointments" value={data?.today_appointments ?? 0} icon={Calendar}     gradient="bg-gradient-to-br from-primary-400 to-primary-600" />
        <StatCard label="Completed Today"       value={data?.today_completed   ?? 0} icon={CheckCircle}  gradient="bg-gradient-to-br from-green-400 to-green-600" />
        <StatCard label="Total Patients"        value={data?.total_patients    ?? 0} icon={Users}        gradient="bg-gradient-to-br from-violet-400 to-violet-600" />
        <StatCard label="Upcoming (7 days)"     value={data?.upcoming_7_days   ?? 0} icon={Clock}        gradient="bg-gradient-to-br from-amber-400 to-amber-600" />
      </div>

      {/* Today's schedule */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Today's Schedule</h3>
          <span className="text-xs text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
            {format(today, 'MMM d, yyyy')}
          </span>
        </div>

        {!todayAppts?.length ? (
          <div className="py-12 text-center">
            <Calendar size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No appointments scheduled for today.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {todayAppts.map((a: any) => (
              <div key={a.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Time pill */}
                  <div className="shrink-0 text-center bg-primary-50 border border-primary-100 rounded-lg px-2.5 py-1.5 min-w-[52px]">
                    <p className="text-xs font-bold text-primary-700 leading-none">
                      {String(a.appointment_time).slice(0, 5)}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{a.patient?.name ?? '—'}</p>
                    <p className="text-xs text-gray-400 truncate">
                      Dr. {a.doctor?.name ?? '—'}
                      {a.treatment_type?.name ? ` · ${a.treatment_type.name}` : ''}
                    </p>
                  </div>
                </div>
                <span className={`shrink-0 ml-2 text-xs px-2.5 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[a.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {a.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
