import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { appointmentsApi, patientsApi, usersApi, treatmentTypesApi } from '@/api'
import type { Appointment } from '@/types'
import { Plus, X, CheckCircle, AlertCircle, Loader2, ExternalLink, Calendar } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'

const STATUS_COLORS: Record<string, string> = {
  scheduled:   'bg-blue-100 text-blue-700',
  confirmed:   'bg-indigo-100 text-indigo-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed:   'bg-green-100 text-green-700',
  cancelled:   'bg-red-100 text-red-600',
  no_show:     'bg-gray-100 text-gray-600',
}

const EMPTY_FORM = {
  mobile: '',
  // found patient
  patient_id: '',
  patient_name: '',
  // new patient fields
  new_name: '',
  new_address: '',
  // appointment fields
  doctor_id: '',
  treatment_type_id: '',
  appointment_date: format(new Date(), 'yyyy-MM-dd'),
  appointment_time: '09:00',
  duration_minutes: 30,
  notes: '',
}

const TIME_SLOTS = Array.from({ length: 28 }, (_, i) => {
  const hour = Math.floor(i / 2) + 8   // 08:00 – 21:30
  const min  = i % 2 === 0 ? '00' : '30'
  const h = String(hour).padStart(2, '0')
  return `${h}:${min}`
})

type PatientStatus = 'idle' | 'searching' | 'found' | 'new'

export default function AppointmentsPage() {
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()
  const [dateFilter, setDateFilter] = useState(searchParams.get('date') ?? format(new Date(), 'yyyy-MM-dd'))
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') ?? '')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [patientStatus, setPatientStatus] = useState<PatientStatus>('idle')
  const [formError, setFormError] = useState('')
  const mobileSearchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Appointment list ──
  const { data, isLoading } = useQuery({
    queryKey: ['appointments', dateFilter, statusFilter],
    queryFn: () => appointmentsApi.list({ date: dateFilter, status: statusFilter || undefined, per_page: 100 }).then((r) => r.data),
  })

  // ── Modal dropdowns ──
  const { data: doctorsData } = useQuery({
    queryKey: ['users-all'],
    queryFn: () => usersApi.list({ per_page: 100 }).then((r) => r.data.data),
    enabled: showModal,
  })
  const { data: typesData } = useQuery({
    queryKey: ['treatment-types'],
    queryFn: () => treatmentTypesApi.list().then((r) => r.data),
    enabled: showModal,
  })

  const doctors = (doctorsData ?? []).filter((u: any) => u.role === 'doctor')

  // ── Status mutation ──
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      appointmentsApi.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['appointments'] }),
  })

  // ── Create appointment ──
  const createMutation = useMutation({
    mutationFn: (data: object) => appointmentsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['appointments'] })
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] })
      closeModal()
    },
    onError: (err: any) => setFormError(err?.response?.data?.detail || 'Failed to book appointment'),
  })

  // ── Create patient then appointment ──
  const createPatientMutation = useMutation({
    mutationFn: (data: object) => patientsApi.create(data),
    onSuccess: (res) => {
      const newPatientId = res.data.data.id
      bookAppointment(newPatientId)
    },
    onError: (err: any) => setFormError(err?.response?.data?.detail || 'Failed to create patient'),
  })

  function closeModal() {
    setShowModal(false)
    setForm(EMPTY_FORM)
    setPatientStatus('idle')
    setFormError('')
    if (mobileSearchTimer.current) clearTimeout(mobileSearchTimer.current)
  }

  // ── Mobile number lookup ──
  function handleMobileChange(mobile: string) {
    // digits only, max 15
    const clean = mobile.replace(/\D/g, '').slice(0, 15)
    setForm((f) => ({ ...f, mobile: clean, patient_id: '', patient_name: '', new_name: '', new_address: '' }))
    setPatientStatus('idle')

    if (mobileSearchTimer.current) clearTimeout(mobileSearchTimer.current)
    if (clean.length < 10) return

    setPatientStatus('searching')
    mobileSearchTimer.current = setTimeout(async () => {
      try {
        const res = await patientsApi.list({ q: clean, per_page: 1 })
        const found = res.data.data.find((p: any) => p.mobile === clean)
        if (found) {
          setForm((f) => ({ ...f, patient_id: found.id, patient_name: found.name }))
          setPatientStatus('found')
        } else {
          setPatientStatus('new')
        }
      } catch {
        setPatientStatus('idle')
      }
    }, 500)
  }

  function bookAppointment(patientId: string) {
    if (!form.doctor_id) { setFormError('Please select a doctor'); return }
    const payload: any = {
      patient_id: patientId,
      doctor_id: form.doctor_id,
      appointment_date: form.appointment_date,
      appointment_time: form.appointment_time,
      duration_minutes: Number(form.duration_minutes),
    }
    if (form.treatment_type_id) payload.treatment_type_id = form.treatment_type_id
    if (form.notes) payload.notes = form.notes
    createMutation.mutate(payload)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError('')

    if (patientStatus === 'found') {
      bookAppointment(form.patient_id)
    } else if (patientStatus === 'new') {
      if (!form.new_name.trim()) { setFormError('Patient name is required'); return }
      createPatientMutation.mutate({
        name: form.new_name.trim(),
        mobile: form.mobile,
        address: form.new_address || undefined,
      })
    } else {
      setFormError('Enter a valid 10-digit mobile number to continue')
    }
  }

  const appointments: Appointment[] = data?.data ?? []
  const isSubmitting = createMutation.isPending || createPatientMutation.isPending

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-gray-900">Appointments</h2>
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to="/treatment-types"
            className="flex items-center gap-1.5 border border-gray-200 text-gray-600 px-3 py-2 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            <ExternalLink size={13} /> Treatment Types
          </Link>
          <button
            onClick={() => { setShowModal(true); setFormError('') }}
            className="flex items-center gap-1.5 bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors shadow-sm"
          >
            <Plus size={14} /> New Appointment
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="">All Statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="confirmed">Confirmed</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="no_show">No Show</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : appointments.length === 0 ? (
          <div className="py-12 text-center">
            <Calendar size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No appointments for this date.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[600px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Time</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Patient</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Doctor</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Duration</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {appointments.map((a: any) => {
                  const appointmentDate = new Date(a.appointment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  return (
                  <tr key={a.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">{appointmentDate} · {String(a.appointment_time).slice(0,5)}</td>
                    <td className="px-4 py-3 text-gray-800 font-medium">{a.patient?.name ?? a.patient_id}</td>
                    <td className="px-4 py-3 text-gray-500">Dr. {a.doctor?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{a.duration_minutes} min</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[a.status]}`}>
                        {a.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        {a.status === 'scheduled' && (
                          <button onClick={() => statusMutation.mutate({ id: a.id, status: 'confirmed' })}
                            className="text-xs text-primary-600 hover:text-primary-800 font-medium">Confirm</button>
                        )}
                        {a.status === 'confirmed' && (
                          <button onClick={() => statusMutation.mutate({ id: a.id, status: 'completed' })}
                            className="text-xs text-green-600 hover:text-green-800 font-medium">Mark Done</button>
                        )}
                        {(a.status === 'scheduled' || a.status === 'confirmed') && (
                          <button onClick={() => statusMutation.mutate({ id: a.id, status: 'cancelled' })}
                            className="text-xs text-red-500 hover:text-red-700 font-medium">Cancel</button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════
          New Appointment Modal
      ══════════════════════════════════════════ */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h3 className="font-semibold text-gray-800">New Appointment</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

              {/* ── SECTION 1: Patient ── */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Patient</h4>

                {/* Mobile lookup */}
                <div className="relative">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Mobile Number *</label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={form.mobile}
                      onChange={(e) => handleMobileChange(e.target.value)}
                      placeholder="Enter 10-digit mobile number"
                      inputMode="numeric"
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm pr-9 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                    {/* Status icon */}
                    <span className="absolute right-3 top-1/2 -translate-y-1/2">
                      {patientStatus === 'searching' && <Loader2 size={15} className="text-gray-400 animate-spin" />}
                      {patientStatus === 'found'     && <CheckCircle size={15} className="text-green-500" />}
                      {patientStatus === 'new'       && <AlertCircle size={15} className="text-amber-500" />}
                    </span>
                  </div>
                </div>

                {/* Found patient banner */}
                {patientStatus === 'found' && (
                  <div className="mt-2 flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <CheckCircle size={14} className="text-green-600 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-green-800">{form.patient_name}</p>
                      <p className="text-xs text-green-600">Existing patient found — ready to book</p>
                    </div>
                  </div>
                )}

                {/* New patient fields */}
                {patientStatus === 'new' && (
                  <div className="mt-3 space-y-3 border border-amber-200 bg-amber-50 rounded-xl p-4">
                    <p className="text-xs font-semibold text-amber-700 flex items-center gap-1.5">
                      <AlertCircle size={13} /> No patient found — fill details to register
                    </p>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
                      <input
                        type="text"
                        value={form.new_name}
                        onChange={(e) => setForm((f) => ({ ...f, new_name: e.target.value }))}
                        placeholder="e.g. Rajesh Kumar"
                        className="w-full border border-gray-200 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                        required={patientStatus === 'new'}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Address</label>
                      <input
                        type="text"
                        value={form.new_address}
                        onChange={(e) => setForm((f) => ({ ...f, new_address: e.target.value }))}
                        placeholder="Street, City (optional)"
                        className="w-full border border-gray-200 bg-white rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* ── SECTION 2: Appointment Details ── */}
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Appointment Details</h4>
                <div className="space-y-3">

                  {/* Doctor */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Doctor *</label>
                    <select
                      value={form.doctor_id}
                      onChange={(e) => setForm((f) => ({ ...f, doctor_id: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    >
                      <option value="">Select doctor…</option>
                      {doctors.map((d: any) => (
                        <option key={d.id} value={d.id}>Dr. {d.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Treatment Type */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Treatment Type
                      <Link to="/treatment-types" className="ml-2 text-primary-500 hover:underline font-normal">
                        + Add new
                      </Link>
                    </label>
                    <select
                      value={form.treatment_type_id}
                      onChange={(e) => {
                        const selected = (typesData ?? []).find((t: any) => t.id === e.target.value)
                        setForm((f) => ({
                          ...f,
                          treatment_type_id: e.target.value,
                          duration_minutes: selected?.default_duration_minutes ?? f.duration_minutes,
                        }))
                      }}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="">Select treatment (optional)…</option>
                      {(typesData ?? []).map((t: any) => (
                        <option key={t.id} value={t.id}>{t.name} ({t.default_duration_minutes} min)</option>
                      ))}
                    </select>
                  </div>

                  {/* Date + Time */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Date *</label>
                      <input
                        type="date"
                        value={form.appointment_date}
                        onChange={(e) => setForm((f) => ({ ...f, appointment_date: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Time *</label>
                      <select
                        value={form.appointment_time}
                        onChange={(e) => setForm((f) => ({ ...f, appointment_time: e.target.value }))}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        required
                      >
                        {TIME_SLOTS.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Duration */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Duration (minutes)</label>
                    <input
                      type="number"
                      min={15}
                      step={15}
                      value={form.duration_minutes}
                      onChange={(e) => setForm((f) => ({ ...f, duration_minutes: Number(e.target.value) }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                    <textarea
                      rows={2}
                      value={form.notes}
                      onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                      placeholder="Any additional notes…"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                    />
                  </div>
                </div>
              </div>

              {formError && (
                <p className="text-sm text-red-600 flex items-center gap-1.5">
                  <AlertCircle size={14} /> {formError}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-xl text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || patientStatus === 'searching' || patientStatus === 'idle'}
                  className="flex-1 bg-primary-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 shadow-sm transition-colors"
                >
                  {isSubmitting
                    ? (createPatientMutation.isPending ? 'Creating patient…' : 'Booking…')
                    : patientStatus === 'new'
                    ? 'Register & Book'
                    : 'Book Appointment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
