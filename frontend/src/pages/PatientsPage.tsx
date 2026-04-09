import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { patientsApi } from '@/api'
import { Search, User, Users } from 'lucide-react'
import { useDebounce } from '@/hooks/useDebounce'

export default function PatientsPage() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading } = useQuery({
    queryKey: ['patients', debouncedSearch],
    queryFn: () =>
      patientsApi.list({ q: debouncedSearch || undefined, per_page: 50 }).then((r) => r.data),
  })

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
            <table className="w-full text-sm min-w-[460px]">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Patient #</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Mobile</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">DOB</th>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
