import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { dashboardApi, appointmentsApi } from '@/api'
import type { DashboardStats } from '@/types'
import { Calendar, CheckCircle, Clock, Send, CheckSquare, Square } from 'lucide-react'
import { format, addDays } from 'date-fns'

type ActiveCard = 'today' | 'completed' | 'upcoming' | null

const STATUS_COLORS: Record<string, string> = {
  scheduled:   'bg-blue-100 text-blue-700',
  confirmed:   'bg-indigo-100 text-indigo-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed:   'bg-green-100 text-green-700',
  cancelled:   'bg-red-100 text-red-600',
  no_show:     'bg-gray-100 text-gray-500',
}

function StatCard({ label, value, icon: Icon, gradient, active, onClick }: {
  label: string; value: number; icon: React.ElementType; gradient: string; active: boolean; onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border p-5 flex items-center gap-4 shadow-sm transition-all cursor-pointer hover:-translate-y-0.5 hover:shadow-md active:scale-95 ${
        active ? 'border-primary-300 ring-2 ring-primary-100' : 'border-gray-100'
      }`}
    >
      <div className={`p-3 rounded-xl ${gradient} shadow-sm`}>
        <Icon size={20} className="text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5">{label}</p>
        <p className="text-[10px] text-primary-500 mt-0.5">{active ? 'Showing below ↓' : 'Tap to view →'}</p>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const today      = new Date()
  const todayStr   = format(today, 'yyyy-MM-dd')
  const weekEndStr = format(addDays(today, 7), 'yyyy-MM-dd')

  const hour = today.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const [activeCard, setActiveCard] = useState<ActiveCard>('today')
  const [selected, setSelected]     = useState<Set<string>>(new Set())
  const [sendResults, setSendResults] = useState<Record<string, boolean | null>>({})

  const { data: statsData, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats', todayStr],
    queryFn: () => dashboardApi.stats().then((r) => r.data),
    staleTime: 0,
  })

  // Today's appointments (for schedule + reminders)
  const { data: todayAppts } = useQuery({
    queryKey: ['today-appointments', todayStr],
    queryFn: () => dashboardApi.todayAppointments().then((r) => r.data.data),
    staleTime: 0,
  })

  // Completed today
  const { data: completedData } = useQuery({
    queryKey: ['appts-completed-today'],
    queryFn: () => appointmentsApi.list({ date: todayStr, status: 'completed', per_page: 100 }).then((r) => r.data.data),
    enabled: activeCard === 'completed',
  })

  // Upcoming 7 days
  const { data: upcomingRes } = useQuery({
    queryKey: ['appts-upcoming', todayStr, weekEndStr],
    queryFn: () => appointmentsApi.list({ date_from: todayStr, date_to: weekEndStr, per_page: 100 }).then((r) => r.data.data),
    enabled: activeCard === 'upcoming',
    staleTime: 0,
  })
  const upcomingData = upcomingRes

  // Reminder mutation
  const reminderMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const results: Record<string, boolean> = {}
      await Promise.allSettled(ids.map(async (id) => {
        try {
          const res = await appointmentsApi.sendWhatsAppReminder(id)
          results[id] = res.data.sent ?? true
        } catch { results[id] = false }
      }))
      return results
    },
    onSuccess: (results) => { setSendResults(results); setSelected(new Set()) },
  })

  function toggleCard(card: ActiveCard) {
    setActiveCard(prev => prev === card ? null : card)
    setSelected(new Set())
    setSendResults({})
  }

  const appts: any[] = todayAppts ?? []
  const selectableIds = appts.filter(a => a.status === 'scheduled' || a.status === 'confirmed').map(a => a.id)
  const allSelected = selectableIds.length > 0 && selected.size === selectableIds.length

  function toggleAll() { setSelected(allSelected ? new Set() : new Set(selectableIds)) }
  function toggleOne(id: string) {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    setSelected(next)
  }

  if (statsLoading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-gray-900">{greeting} 👋</h2>
        <p className="text-sm text-gray-500 mt-0.5">{format(today, 'EEEE, MMMM d, yyyy')}</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
        <StatCard label="Today's Appointments" value={statsData?.today_appointments ?? 0} icon={Calendar}    gradient="bg-gradient-to-br from-primary-400 to-primary-600" active={activeCard === 'today'}     onClick={() => toggleCard('today')} />
        <StatCard label="Completed Today"       value={statsData?.today_completed   ?? 0} icon={CheckCircle} gradient="bg-gradient-to-br from-green-400 to-green-600"   active={activeCard === 'completed'} onClick={() => toggleCard('completed')} />
        <StatCard label="Upcoming (7 days)"     value={statsData?.upcoming_7_days   ?? 0} icon={Clock}       gradient="bg-gradient-to-br from-amber-400 to-amber-600"   active={activeCard === 'upcoming'}  onClick={() => toggleCard('upcoming')} />
      </div>

      {/* ── TODAY'S APPOINTMENTS ── */}
      {activeCard === 'today' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3">
              {selectableIds.length > 0 && (
                <button onClick={toggleAll} className="text-gray-400 hover:text-primary-600 transition-colors">
                  {allSelected ? <CheckSquare size={18} className="text-primary-600" /> : <Square size={18} />}
                </button>
              )}
              <h3 className="font-semibold text-gray-800">Today's Schedule</h3>
              <span className="text-xs text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
                {format(today, 'MMM d, yyyy')}
              </span>
            </div>
            {selected.size > 0 && (
              <button
                onClick={() => reminderMutation.mutate(Array.from(selected))}
                disabled={reminderMutation.isPending}
                className="flex items-center gap-2 bg-[#25D366] text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#1ebe5d] disabled:opacity-60 transition-colors shadow-sm"
              >
                <Send size={14} />
                {reminderMutation.isPending ? 'Sending…' : `Send Reminder (${selected.size})`}
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
                  <div key={a.id} className={`flex items-center gap-3 px-5 py-3.5 transition-colors ${isSelected ? 'bg-primary-50/50' : 'hover:bg-gray-50/50'}`}>
                    <button onClick={() => isSelectable && toggleOne(a.id)}
                      className={`shrink-0 transition-colors ${isSelectable ? 'text-gray-400 hover:text-primary-600 cursor-pointer' : 'text-gray-200 cursor-default'}`}>
                      {isSelected ? <CheckSquare size={17} className="text-primary-600" /> : <Square size={17} />}
                    </button>
                    <div className="shrink-0 text-center bg-primary-50 border border-primary-100 rounded-lg px-2.5 py-1.5 min-w-[52px]">
                      <p className="text-xs font-bold text-primary-700 leading-none">{String(a.appointment_time).slice(0, 5)}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-800 truncate">{a.patient?.name ?? '—'}</p>
                      <p className="text-xs text-gray-400 truncate">{a.doctor?.name ?? '—'}{a.treatment_type?.name ? ` · ${a.treatment_type.name}` : ''}</p>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      {result === true  && <span className="text-xs text-[#25D366] font-medium flex items-center gap-1"><CheckCircle size={12} /> Sent</span>}
                      {result === false && <span className="text-xs text-red-400 font-medium">Failed</span>}
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
      )}

      {/* ── COMPLETED TODAY ── */}
      {activeCard === 'completed' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Completed Today</h3>
            <span className="text-xs text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">{format(today, 'MMM d, yyyy')}</span>
          </div>
          {!completedData ? (
            <div className="flex items-center justify-center py-12"><div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : completedData.length === 0 ? (
            <div className="py-12 text-center"><CheckCircle size={32} className="text-gray-200 mx-auto mb-3" /><p className="text-sm text-gray-400">No completed appointments today.</p></div>
          ) : (
            <div className="divide-y divide-gray-50">
              {completedData.map((a: any) => (
                <div key={a.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                  <div className="shrink-0 bg-green-50 border border-green-100 rounded-lg px-2.5 py-1.5 min-w-[52px] text-center">
                    <p className="text-xs font-bold text-green-700">{String(a.appointment_time).slice(0, 5)}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800 truncate">{a.patient?.name ?? '—'}</p>
                    <p className="text-xs text-gray-400 truncate">{a.doctor?.name ?? '—'}{a.treatment_type?.name ? ` · ${a.treatment_type.name}` : ''}</p>
                  </div>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-green-100 text-green-700">Completed</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── UPCOMING 7 DAYS ── */}
      {activeCard === 'upcoming' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Upcoming Appointments</h3>
            <span className="text-xs text-gray-400 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
              {format(today, 'MMM d')} – {format(addDays(today, 7), 'MMM d, yyyy')}
            </span>
          </div>
          {!upcomingData ? (
            <div className="flex items-center justify-center py-12"><div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : upcomingData.length === 0 ? (
            <div className="py-12 text-center"><Clock size={32} className="text-gray-200 mx-auto mb-3" /><p className="text-sm text-gray-400">No upcoming appointments this week.</p></div>
          ) : (
            <div className="divide-y divide-gray-50">
              {upcomingData.map((a: any) => (
                <div key={a.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                  <div className="shrink-0 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-1.5 text-center min-w-[64px]">
                    <p className="text-[10px] font-semibold text-amber-600 leading-none">
                      {new Date(a.appointment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                    <p className="text-xs font-bold text-amber-700 mt-0.5">{String(a.appointment_time).slice(0, 5)}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800 truncate">{a.patient?.name ?? '—'}</p>
                    <p className="text-xs text-gray-400 truncate">{a.doctor?.name ?? '—'}{a.treatment_type?.name ? ` · ${a.treatment_type.name}` : ''}</p>
                  </div>
                  <span className={`shrink-0 text-xs px-2.5 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[a.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {a.status.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
