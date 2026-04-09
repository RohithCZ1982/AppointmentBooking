import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { dashboardApi, appointmentsApi } from '@/api'
import type { DashboardStats } from '@/types'
import { Calendar, CheckCircle, Users, Clock, Send, CheckSquare, Square } from 'lucide-react'
import { format } from 'date-fns'

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
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [sendResults, setSendResults] = useState<Record<string, boolean | null>>({})

  const { data, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardApi.stats().then((r) => r.data),
  })

  const { data: todayAppts } = useQuery({
    queryKey: ['today-appointments'],
    queryFn: () => dashboardApi.todayAppointments().then((r) => r.data.data),
  })

  const reminderMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results: Record<string, boolean> = {}
      await Promise.allSettled(
        ids.map(async (id) => {
          try {
            const res = await appointmentsApi.sendWhatsAppReminder(id)
            results[id] = res.data.sent ?? true
          } catch {
            results[id] = false
          }
        })
      )
      return results
    },
    onSuccess: (results) => {
      setSendResults(results)
      setSelected(new Set())
    },
  })

  const appts: any[] = todayAppts ?? []

  // only allow selecting scheduled/confirmed appointments
  const selectableIds = appts
    .filter((a) => a.status === 'scheduled' || a.status === 'confirmed')
    .map((a) => a.id)

  function toggleAll() {
    if (selected.size === selectableIds.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(selectableIds))
    }
  }

  function toggleOne(id: string) {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelected(next)
  }

  const allSelected = selectableIds.length > 0 && selected.size === selectableIds.length

  if (isLoading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">Good morning 👋</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          {format(today, 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <StatCard label="Today's Appointments" value={data?.today_appointments ?? 0} icon={Calendar}    gradient="bg-gradient-to-br from-primary-400 to-primary-600" />
        <StatCard label="Completed Today"       value={data?.today_completed   ?? 0} icon={CheckCircle} gradient="bg-gradient-to-br from-green-400 to-green-600" />
        <StatCard label="Total Patients"        value={data?.total_patients    ?? 0} icon={Users}       gradient="bg-gradient-to-br from-violet-400 to-violet-600" />
        <StatCard label="Upcoming (7 days)"     value={data?.upcoming_7_days   ?? 0} icon={Clock}       gradient="bg-gradient-to-br from-amber-400 to-amber-600" />
      </div>

      {/* Today's schedule */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            {/* Select-all checkbox */}
            {selectableIds.length > 0 && (
              <button onClick={toggleAll} className="text-gray-400 hover:text-primary-600 transition-colors">
                {allSelected
                  ? <CheckSquare size={18} className="text-primary-600" />
                  : <Square size={18} />}
              </button>
            )}
            <h3 className="font-semibold text-gray-800">Today's Schedule</h3>
            <span className="text-xs text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
              {format(today, 'MMM d, yyyy')}
            </span>
          </div>

          {/* Send Reminder button */}
          {selected.size > 0 && (
            <button
              onClick={() => reminderMutation.mutate(Array.from(selected))}
              disabled={reminderMutation.isPending}
              className="flex items-center gap-2 bg-[#25D366] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#1ebe5d] disabled:opacity-60 transition-colors shadow-sm"
            >
              <Send size={14} />
              {reminderMutation.isPending
                ? 'Sending…'
                : `Send Reminder (${selected.size})`}
            </button>
          )}
        </div>

        {!appts.length ? (
          <div className="py-12 text-center">
            <Calendar size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No appointments scheduled for today.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {appts.map((a: any) => {
              const isSelectable = a.status === 'scheduled' || a.status === 'confirmed'
              const isSelected = selected.has(a.id)
              const result = sendResults[a.id]

              return (
                <div
                  key={a.id}
                  className={`flex items-center gap-3 px-5 py-3.5 transition-colors ${
                    isSelected ? 'bg-primary-50/50' : 'hover:bg-gray-50/50'
                  }`}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => isSelectable && toggleOne(a.id)}
                    className={`shrink-0 transition-colors ${
                      isSelectable
                        ? 'text-gray-400 hover:text-primary-600 cursor-pointer'
                        : 'text-gray-200 cursor-default'
                    }`}
                  >
                    {isSelected
                      ? <CheckSquare size={17} className="text-primary-600" />
                      : <Square size={17} />}
                  </button>

                  {/* Time pill */}
                  <div className="shrink-0 text-center bg-primary-50 border border-primary-100 rounded-lg px-2.5 py-1.5 min-w-[52px]">
                    <p className="text-xs font-bold text-primary-700 leading-none">
                      {String(a.appointment_time).slice(0, 5)}
                    </p>
                  </div>

                  {/* Patient info */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800 truncate">{a.patient?.name ?? '—'}</p>
                    <p className="text-xs text-gray-400 truncate">
                      Dr. {a.doctor?.name ?? '—'}
                      {a.treatment_type?.name ? ` · ${a.treatment_type.name}` : ''}
                    </p>
                  </div>

                  {/* Status + send result */}
                  <div className="shrink-0 flex items-center gap-2">
                    {result === true && (
                      <span className="text-xs text-[#25D366] font-medium flex items-center gap-1">
                        <CheckCircle size={12} /> Sent
                      </span>
                    )}
                    {result === false && (
                      <span className="text-xs text-red-400 font-medium">Failed</span>
                    )}
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[a.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {a.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
