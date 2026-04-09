import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { treatmentTypesApi } from '@/api'
import { Plus, X, Pencil, Trash2 } from 'lucide-react'

const EMPTY_FORM = { name: '', description: '', default_duration_minutes: 30, color: '#3b82f6' }

export default function TreatmentTypesPage() {
  const qc = useQueryClient()
  const [showModal, setShowModal] = useState(false)
  const [editTarget, setEditTarget] = useState<any>(null) // null = create, obj = edit
  const [form, setForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')

  const { data: types, isLoading } = useQuery({
    queryKey: ['treatment-types'],
    queryFn: () => treatmentTypesApi.list().then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: object) => treatmentTypesApi.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['treatment-types'] }); closeModal() },
    onError: (err: any) => setFormError(err?.response?.data?.detail || 'Failed to save'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) => treatmentTypesApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['treatment-types'] }); closeModal() },
    onError: (err: any) => setFormError(err?.response?.data?.detail || 'Failed to update'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => treatmentTypesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['treatment-types'] }),
  })

  function openCreate() {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setFormError('')
    setShowModal(true)
  }

  function openEdit(t: any) {
    setEditTarget(t)
    setForm({
      name: t.name,
      description: t.description ?? '',
      default_duration_minutes: t.default_duration_minutes,
      color: t.color ?? '#3b82f6',
    })
    setFormError('')
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setFormError('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      name: form.name,
      description: form.description || undefined,
      default_duration_minutes: Number(form.default_duration_minutes),
      color: form.color,
    }
    if (editTarget) {
      updateMutation.mutate({ id: editTarget.id, data: payload })
    } else {
      createMutation.mutate(payload)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Treatment Types</h2>
          <p className="text-xs text-gray-400 mt-0.5">Manage the list of treatments offered at the clinic</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary-700 shadow-sm transition-colors"
        >
          <Plus size={14} /> Add Treatment Type
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !types?.length ? (
          <div className="p-8 text-center">
            <p className="text-sm text-gray-400 mb-3">No treatment types yet.</p>
            <button onClick={openCreate} className="text-sm text-primary-600 hover:underline font-medium">
              Add your first treatment type
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[480px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Color</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Description</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Duration</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {types.map((t: any) => (
                  <tr key={t.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <span
                        className="inline-block w-5 h-5 rounded-full border border-gray-200 shadow-sm"
                        style={{ backgroundColor: t.color ?? '#14b8a6' }}
                      />
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{t.name}</td>
                    <td className="px-4 py-3 text-gray-400 max-w-xs truncate hidden md:table-cell">{t.description ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{t.default_duration_minutes} min</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <button
                          onClick={() => openEdit(t)}
                          className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-medium"
                        >
                          <Pencil size={12} /> Edit
                        </button>
                        <button
                          onClick={() => deleteMutation.mutate(t.id)}
                          className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium"
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">
                {editTarget ? 'Edit Treatment Type' : 'Add Treatment Type'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Root Canal, Teeth Cleaning"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description (optional)"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Default Duration (min)</label>
                  <input
                    type="number"
                    min={5}
                    step={5}
                    value={form.default_duration_minutes}
                    onChange={(e) => setForm({ ...form, default_duration_minutes: Number(e.target.value) })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Calendar Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={form.color}
                      onChange={(e) => setForm({ ...form, color: e.target.value })}
                      className="w-10 h-9 rounded cursor-pointer border border-gray-300 p-0.5"
                    />
                    <span className="text-xs text-gray-500">{form.color}</span>
                  </div>
                </div>
              </div>

              {formError && <p className="text-sm text-red-600">{formError}</p>}

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
                  disabled={isPending}
                  className="flex-1 bg-primary-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                  {isPending ? 'Saving…' : editTarget ? 'Save Changes' : 'Add Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
