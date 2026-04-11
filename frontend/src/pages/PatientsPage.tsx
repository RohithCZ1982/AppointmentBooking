import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { patientsApi } from '@/api'
import { Search, User, Users, Pencil, X } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'

const EMPTY_EDIT = { name: '', mobile: '', email: '', date_of_birth: '', gender: '', address: '', blood_group: '', allergies: '', current_medications: '', emergency_contact_name: '', emergency_contact_mobile: '' }

export default function PatientsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)
  const [editPatient, setEditPatient] = useState<any>(null)
  const [form, setForm] = useState(EMPTY_EDIT)
  const [formError, setFormError] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['patients', debouncedSearch],
    queryFn: () => patientsApi.list({ q: debouncedSearch || undefined, per_page: 50 }).then((r) => r.data),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) => patientsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['patients'] })
      setEditPatient(null)
      setFormError('')
    },
    onError: (err: any) => setFormError(err?.response?.data?.detail || 'Failed to update patient'),
  })

  function openEdit(p: any) {
    setEditPatient(p)
    setForm({
      name: p.name ?? '',
      mobile: p.mobile ?? '',
      email: p.email ?? '',
      date_of_birth: p.date_of_birth ?? '',
      gender: p.gender ?? '',
      address: p.address ?? '',
      blood_group: p.blood_group ?? '',
      allergies: p.allergies ?? '',
      current_medications: p.current_medications ?? '',
      emergency_contact_name: p.emergency_contact_name ?? '',
      emergency_contact_mobile: p.emergency_contact_mobile ?? '',
    })
    setFormError('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    updateMutation.mutate({ id: editPatient.id, data: form })
  }

  const patients = data?.data ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Patients</h2>
        <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
          {data?.pagination?.total ?? 0} total
        </span>
      </div>

      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name or mobile…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : patients.length === 0 ? (
          <div className="py-12 text-center">
            <Users size={32} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-400">No patients found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[500px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Patient #</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Mobile</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">DOB</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {patients.map((p: any) => (
                  <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-gray-400 text-xs font-mono">{p.patient_number ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/patients/${p.id}`}
                        className="font-semibold text-primary-700 hover:text-primary-900 flex items-center gap-1.5"
                      >
                        <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center shrink-0">
                          <User size={11} className="text-primary-600" />
                        </div>
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.mobile}</td>
                    <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">{p.date_of_birth ?? '—'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => openEdit(p)}
                        className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-medium"
                      >
                        <Pencil size={12} /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Patient Modal */}
      {editPatient && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <div>
                <h3 className="font-semibold text-gray-800">Edit Patient</h3>
                <p className="text-xs text-gray-400 mt-0.5">{editPatient.patient_number}</p>
              </div>
              <button onClick={() => setEditPatient(null)} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
              {[
                { label: 'Full Name *', key: 'name', type: 'text', required: true },
                { label: 'Mobile Number *', key: 'mobile', type: 'tel', required: true },
                { label: 'Email', key: 'email', type: 'email' },
                { label: 'Date of Birth', key: 'date_of_birth', type: 'date' },
                { label: 'Address', key: 'address', type: 'text' },
                { label: 'Blood Group', key: 'blood_group', type: 'text' },
                { label: 'Allergies', key: 'allergies', type: 'text' },
                { label: 'Current Medications', key: 'current_medications', type: 'text' },
                { label: 'Emergency Contact Name', key: 'emergency_contact_name', type: 'text' },
                { label: 'Emergency Contact Mobile', key: 'emergency_contact_mobile', type: 'tel' },
              ].map(({ label, key, type, required }) => (
                <div key={key}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
                  <input
                    type={type}
                    value={(form as any)[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    required={required}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              ))}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Gender</label>
                <select
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Select…</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              {formError && (
                <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  <p className="text-xs text-red-600">{formError}</p>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditPatient(null)}
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
