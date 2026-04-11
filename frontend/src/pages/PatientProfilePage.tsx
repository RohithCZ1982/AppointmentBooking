import { useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { patientsApi, imagesApi, plansApi, appointmentsApi } from '@/api'
import { User, FileText, Image, ClipboardList, Pencil, X, Calendar } from 'lucide-react'
import { useState } from 'react'

type Tab = 'overview' | 'records' | 'images' | 'plans'

const STATUS_COLORS: Record<string, string> = {
  scheduled:   'bg-blue-100 text-blue-700',
  confirmed:   'bg-indigo-100 text-indigo-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed:   'bg-green-100 text-green-700',
  cancelled:   'bg-red-100 text-red-600',
  no_show:     'bg-gray-100 text-gray-500',
}

const EMPTY_EDIT = {
  name: '', mobile: '', email: '', date_of_birth: '', gender: '',
  address: '', blood_group: '', allergies: '', current_medications: '',
  emergency_contact_name: '', emergency_contact_mobile: '',
}

const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500'

export default function PatientProfilePage() {
  const { patientId } = useParams<{ patientId: string }>()
  const qc = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState(EMPTY_EDIT)
  const [editError, setEditError] = useState('')

  const { data: patient, isLoading: patientLoading } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => patientsApi.get(patientId!).then((r) => r.data.data),
    enabled: !!patientId,
  })

  // Upcoming / active appointments for this patient (overview)
  const { data: appointmentsData } = useQuery({
    queryKey: ['patient-upcoming-appointments', patientId],
    queryFn: async () => {
      const res = await appointmentsApi.list({ patient_id: patientId, per_page: 100 })
      const all: any[] = res.data.data ?? []
      return all.filter((a: any) => ['scheduled', 'confirmed', 'in_progress'].includes(a.status))
    },
    enabled: !!patientId && activeTab === 'overview',
  })

  // Completed treatments for this patient
  const { data: treatmentsData } = useQuery({
    queryKey: ['patient-treatments', patientId],
    queryFn: () => appointmentsApi.list({ patient_id: patientId, status: 'completed', per_page: 100 }).then((r) => r.data.data),
    enabled: !!patientId && activeTab === 'records',
  })

  const { data: imagesRes } = useQuery({
    queryKey: ['images', patientId],
    queryFn: () => imagesApi.list(patientId!).then((r) => r.data),
    enabled: !!patientId && activeTab === 'images',
  })

  const { data: plansRes } = useQuery({
    queryKey: ['plans', patientId],
    queryFn: () => plansApi.list(patientId!).then((r) => r.data),
    enabled: !!patientId && activeTab === 'plans',
  })

  const updateMutation = useMutation({
    mutationFn: (data: object) => patientsApi.update(patientId!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patient', patientId] })
      qc.invalidateQueries({ queryKey: ['patients'] })
      setShowEdit(false)
      setEditError('')
    },
    onError: (err: any) => setEditError(err?.response?.data?.detail || 'Failed to update patient'),
  })

  function openEdit() {
    if (!patient) return
    setEditForm({
      name: patient.name ?? '',
      mobile: patient.mobile ?? '',
      email: patient.email ?? '',
      date_of_birth: patient.date_of_birth ?? '',
      gender: patient.gender ?? '',
      address: patient.address ?? '',
      blood_group: patient.blood_group ?? '',
      allergies: patient.allergies ?? '',
      current_medications: patient.current_medications ?? '',
      emergency_contact_name: patient.emergency_contact_name ?? '',
      emergency_contact_mobile: patient.emergency_contact_mobile ?? '',
    })
    setEditError('')
    setShowEdit(true)
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    updateMutation.mutate(editForm)
  }

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview',          icon: User },
    { id: 'records',  label: 'Treatment Records', icon: FileText },
    { id: 'images',   label: 'X-rays & Images',   icon: Image },
    { id: 'plans',    label: 'Treatment Plans',    icon: ClipboardList },
  ]

  const appointments: any[] = appointmentsData ?? []

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        {patientLoading ? (
          <div className="h-12 bg-gray-100 animate-pulse rounded-xl" />
        ) : patient ? (
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center shrink-0">
                <User size={22} className="text-primary-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">{patient.name}</h2>
                <p className="text-sm text-gray-500 mt-0.5">{patient.mobile} · <span className="font-mono text-xs">{patient.patient_number ?? '—'}</span></p>
                {patient.allergies && (
                  <p className="text-xs text-red-600 mt-1 bg-red-50 px-2 py-0.5 rounded-full inline-block">Allergies: {patient.allergies}</p>
                )}
              </div>
            </div>
            <button
              onClick={openEdit}
              className="flex items-center gap-1.5 border border-gray-200 text-gray-600 px-3 py-1.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors shrink-0"
            >
              <Pencil size={13} /> Edit
            </button>
          </div>
        ) : (
          <p className="text-sm text-gray-400">Patient not found.</p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit overflow-x-auto">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === id ? 'bg-white text-primary-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        {/* ── OVERVIEW ── */}
        {activeTab === 'overview' && patient && (
          <div>
            {/* Patient Details */}
            <div className="px-5 py-4 border-b border-gray-50">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Patient Details</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-8 gap-y-3 text-sm">
                {[
                  ['Date of Birth', patient.date_of_birth ?? '—'],
                  ['Gender',        patient.gender ?? '—'],
                  ['Blood Group',   patient.blood_group ?? '—'],
                  ['Email',         patient.email ?? '—'],
                  ['Address',       patient.address ?? '—'],
                  ['Medications',   patient.current_medications ?? '—'],
                  ['Emergency Contact', patient.emergency_contact_name ?? '—'],
                  ['Emergency Mobile',  patient.emergency_contact_mobile ?? '—'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-gray-400 text-xs">{label}</dt>
                    <dd className="font-medium text-gray-800 mt-0.5 text-sm">{value}</dd>
                  </div>
                ))}
              </div>
            </div>

            {/* Appointment History */}
            <div className="px-5 py-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Upcoming Appointments
                {appointments.length > 0 && (
                  <span className="ml-2 bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-normal normal-case">{appointments.length}</span>
                )}
              </h3>
              {!appointmentsData ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : appointments.length === 0 ? (
                <div className="py-8 text-center">
                  <Calendar size={28} className="text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No upcoming appointments.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {[...appointments]
                    .sort((a, b) => {
                      const da = new Date(`${a.appointment_date}T${a.appointment_time}`)
                      const db = new Date(`${b.appointment_date}T${b.appointment_time}`)
                      return db.getTime() - da.getTime()
                    })
                    .map((a: any) => (
                    <div key={a.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100/70 transition-colors">
                      <div className="shrink-0 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-center min-w-[64px]">
                        <p className="text-[10px] font-semibold text-gray-500 leading-none">
                          {new Date(a.appointment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        <p className="text-xs font-bold text-gray-700 mt-0.5">{String(a.appointment_time).slice(0, 5)}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-gray-800 truncate">
                          {a.treatment_type?.name ?? 'General'}
                        </p>
                        <p className="text-xs text-gray-400 truncate">{a.doctor?.name ?? '—'}</p>
                      </div>
                      {a.notes && (
                        <p className="text-xs text-gray-400 truncate max-w-[120px] hidden sm:block">{a.notes}</p>
                      )}
                      <span className={`shrink-0 text-xs px-2.5 py-0.5 rounded-full font-medium capitalize ${STATUS_COLORS[a.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {a.status.replace('_', ' ')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── RECORDS (completed treatments) ── */}
        {activeTab === 'records' && (
          <div className="p-5 space-y-2">
            {!treatmentsData ? (
              <div className="flex items-center justify-center py-8"><div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : treatmentsData.length === 0 ? (
              <div className="py-8 text-center">
                <FileText size={28} className="text-gray-200 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No completed treatments yet.</p>
              </div>
            ) : (
              [...treatmentsData]
                .sort((a, b) => new Date(b.appointment_date).getTime() - new Date(a.appointment_date).getTime())
                .map((a: any) => (
                <div key={a.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="shrink-0 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-center min-w-[64px]">
                    <p className="text-[10px] font-semibold text-gray-500 leading-none">
                      {new Date(a.appointment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <p className="text-xs font-bold text-gray-700 mt-0.5">{String(a.appointment_time).slice(0, 5)}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800 truncate">{a.treatment_type?.name ?? 'General'}</p>
                    <p className="text-xs text-gray-400 truncate">{a.doctor?.name ?? '—'}</p>
                    {a.notes && <p className="text-xs text-gray-400 mt-0.5 truncate">{a.notes}</p>}
                  </div>
                  <span className="shrink-0 text-xs px-2.5 py-0.5 rounded-full font-medium bg-green-100 text-green-700">Completed</span>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── IMAGES ── */}
        {activeTab === 'images' && (
          <div className="p-5">
            {!imagesRes ? (
              <div className="flex items-center justify-center py-8"><div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : imagesRes?.data?.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">No images uploaded yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {imagesRes?.data?.map((img: any) => (
                  <div key={img.id} className="border border-gray-200 rounded-xl p-3 text-xs">
                    <p className="font-medium truncate">{img.file_name}</p>
                    <p className="text-gray-400 mt-1">{img.image_type} · {img.image_category}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PLANS ── */}
        {activeTab === 'plans' && (
          <div className="p-5 space-y-3">
            {!plansRes ? (
              <div className="flex items-center justify-center py-8"><div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : plansRes?.data?.length === 0 ? (
              <p className="text-sm text-gray-400 py-6 text-center">No treatment plans yet.</p>
            ) : (
              plansRes?.data?.map((plan: any) => (
                <div key={plan.id} className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-gray-800">{plan.title}</h4>
                    <span className="text-xs text-gray-400 capitalize">{plan.status}</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{plan.items?.length ?? 0} item(s)</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ── EDIT MODAL ── */}
      {showEdit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div>
                <h3 className="font-semibold text-gray-800">Edit Patient</h3>
                <p className="text-xs text-gray-400 mt-0.5">{patient?.patient_number}</p>
              </div>
              <button onClick={() => setShowEdit(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            <form onSubmit={handleEditSubmit} className="px-6 py-5 space-y-4">
              {([
                { label: 'Full Name *',    key: 'name',                    type: 'text', required: true },
                { label: 'Mobile Number *', key: 'mobile',                  type: 'tel',  required: true },
                { label: 'Email',          key: 'email',                   type: 'email' },
                { label: 'Date of Birth',  key: 'date_of_birth',           type: 'date' },
                { label: 'Address',        key: 'address',                 type: 'text' },
                { label: 'Blood Group',    key: 'blood_group',             type: 'text' },
                { label: 'Allergies',      key: 'allergies',               type: 'text' },
                { label: 'Current Medications', key: 'current_medications', type: 'text' },
                { label: 'Emergency Contact Name',   key: 'emergency_contact_name',   type: 'text' },
                { label: 'Emergency Contact Mobile', key: 'emergency_contact_mobile', type: 'tel' },
              ] as { label: string; key: keyof typeof editForm; type: string; required?: boolean }[]).map(({ label, key, type, required }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input
                    type={type}
                    value={editForm[key]}
                    onChange={(e) => setEditForm({ ...editForm, [key]: e.target.value })}
                    required={required}
                    className={inputCls}
                  />
                </div>
              ))}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Gender</label>
                <select
                  value={editForm.gender}
                  onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}
                  className={inputCls}
                >
                  <option value="">Select…</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {editError && (
                <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  <p className="text-xs text-red-600">{editError}</p>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowEdit(false)}
                  className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={updateMutation.isPending}
                  className="flex-1 bg-primary-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 shadow-sm transition-colors">
                  {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
