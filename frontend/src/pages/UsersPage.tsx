import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi } from '@/api'
import { Plus, X, UserCheck, UserX, Pencil } from 'lucide-react'

const ROLE_COLORS: Record<string, string> = {
  admin:        'bg-purple-100 text-purple-700',
  doctor:       'bg-blue-100 text-blue-700',
  receptionist: 'bg-gray-100 text-gray-600',
}

const EMPTY_FORM = { name: '', mobile: '', pin: '', role: 'receptionist' as string }

export default function UsersPage() {
  const qc = useQueryClient()
  const [showModal, setShowModal]   = useState(false)
  const [editUser,  setEditUser]    = useState<any>(null)
  const [form,      setForm]        = useState(EMPTY_FORM)
  const [formError, setFormError]   = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list({ per_page: 100 }).then((r) => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: object) => usersApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setShowModal(false)
      setForm(EMPTY_FORM)
      setFormError('')
    },
    onError: (err: any) => setFormError(err?.response?.data?.detail || 'Failed to create user'),
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) => usersApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setEditUser(null)
      setFormError('')
    },
    onError: (err: any) => setFormError(err?.response?.data?.detail || 'Failed to update user'),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      is_active ? usersApi.deactivate(id) : usersApi.update(id, { is_active: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  function openCreate() {
    setForm(EMPTY_FORM)
    setFormError('')
    setShowModal(true)
  }

  function openEdit(u: any) {
    setEditUser(u)
    setForm({ name: u.name, mobile: u.mobile, pin: '', role: u.role })
    setFormError('')
  }

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (form.pin.length !== 4 || !/^\d{4}$/.test(form.pin)) {
      setFormError('PIN must be exactly 4 digits')
      return
    }
    createMutation.mutate(form)
  }

  function handleUpdate(e: React.FormEvent) {
    e.preventDefault()
    const payload: any = { name: form.name, mobile: form.mobile, role: form.role }
    if (form.pin) {
      if (form.pin.length !== 4 || !/^\d{4}$/.test(form.pin)) {
        setFormError('PIN must be exactly 4 digits')
        return
      }
      payload.pin = form.pin
    }
    updateMutation.mutate({ id: editUser.id, data: payload })
  }

  const users = data?.data ?? []

  const inputCls = "w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"

  function UserForm({ onSubmit, isEdit }: { onSubmit: (e: React.FormEvent) => void; isEdit?: boolean }) {
    return (
      <form onSubmit={onSubmit} className="px-6 py-4 space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Full Name *</label>
          <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Dr. Priya Sharma" className={inputCls} required />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Mobile Number *</label>
          <input type="tel" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })}
            placeholder="10-digit mobile" className={inputCls} required />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Role *</label>
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={inputCls}>
            <option value="receptionist">Receptionist</option>
            <option value="doctor">Doctor</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            4-Digit PIN {isEdit ? <span className="text-gray-400 font-normal">(leave blank to keep current)</span> : '*'}
          </label>
          <input type="password" value={form.pin}
            onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
            placeholder="••••" maxLength={4} inputMode="numeric"
            className={`${inputCls} tracking-widest`} required={!isEdit} />
        </div>

        {formError && (
          <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            <p className="text-xs text-red-600">{formError}</p>
          </div>
        )}

        <div className="flex gap-3 pt-1">
          <button type="button"
            onClick={() => isEdit ? setEditUser(null) : setShowModal(false)}
            className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-xl text-sm hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            className="flex-1 bg-primary-600 text-white py-2 rounded-xl text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 shadow-sm transition-colors">
            {createMutation.isPending || updateMutation.isPending
              ? (isEdit ? 'Saving…' : 'Creating…')
              : (isEdit ? 'Save Changes' : 'Create User')}
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Users</h2>
        <button onClick={openCreate}
          className="flex items-center gap-1.5 bg-primary-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary-700 shadow-sm transition-colors">
          <Plus size={14} /> Add User
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <p className="p-8 text-sm text-center text-gray-400">No users found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[520px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">Mobile</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((u: any) => (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-gray-800">{u.name}</td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{u.mobile}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium capitalize ${ROLE_COLORS[u.role]}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <button onClick={() => openEdit(u)}
                          className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-800 font-medium">
                          <Pencil size={12} /> Edit
                        </button>
                        <button onClick={() => toggleMutation.mutate({ id: u.id, is_active: u.is_active })}
                          className={`flex items-center gap-1 text-xs font-medium transition-colors ${u.is_active ? 'text-red-500 hover:text-red-700' : 'text-green-600 hover:text-green-800'}`}>
                          {u.is_active ? <><UserX size={12} /> Deactivate</> : <><UserCheck size={12} /> Activate</>}
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

      {/* Add User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">Add User</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <UserForm onSubmit={handleCreate} />
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-800">Edit User</h3>
                <p className="text-xs text-gray-400 mt-0.5">{editUser.mobile}</p>
              </div>
              <button onClick={() => setEditUser(null)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <UserForm onSubmit={handleUpdate} isEdit />
          </div>
        </div>
      )}
    </div>
  )
}
