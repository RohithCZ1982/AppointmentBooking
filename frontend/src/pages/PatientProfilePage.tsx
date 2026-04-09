import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { patientsApi, recordsApi, imagesApi, plansApi, dentalChartApi } from '@/api'
import { User, FileText, Image, ClipboardList, Activity } from 'lucide-react'
import { useState } from 'react'

type Tab = 'overview' | 'records' | 'images' | 'plans' | 'chart'

export default function PatientProfilePage() {
  const { patientId } = useParams<{ patientId: string }>()
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  const { data: patientRes } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => patientsApi.get(patientId!).then((r) => r.data.data),
    enabled: !!patientId,
  })

  const { data: recordsRes } = useQuery({
    queryKey: ['records', patientId],
    queryFn: () => recordsApi.list(patientId!).then((r) => r.data),
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

  const patient = patientRes

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview',          icon: User },
    { id: 'records',  label: 'Treatment Records', icon: FileText },
    { id: 'images',   label: 'X-rays & Images',   icon: Image },
    { id: 'plans',    label: 'Treatment Plans',    icon: ClipboardList },
    { id: 'chart',    label: 'Dental Chart',       icon: Activity },
  ]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        {patient ? (
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
              <User size={24} className="text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{patient.name}</h2>
              <p className="text-sm text-gray-500">{patient.mobile} · {patient.patient_number ?? 'No ID'}</p>
              {patient.allergies && (
                <p className="text-xs text-red-600 mt-1">Allergies: {patient.allergies}</p>
              )}
            </div>
          </div>
        ) : (
          <div className="h-12 bg-gray-100 animate-pulse rounded" />
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === id
                ? 'bg-white text-primary-700 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        {activeTab === 'overview' && patient && (
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            {[
              ['Date of Birth', patient.date_of_birth ?? '—'],
              ['Gender', patient.gender ?? '—'],
              ['Blood Group', patient.blood_group ?? '—'],
              ['Email', patient.email ?? '—'],
              ['Address', patient.address ?? '—'],
              ['Emergency Contact', patient.emergency_contact_name ?? '—'],
              ['Emergency Mobile', patient.emergency_contact_mobile ?? '—'],
              ['Current Medications', patient.current_medications ?? '—'],
              ['Medical History', patient.medical_history ?? '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-gray-400 text-xs">{label}</dt>
                <dd className="font-medium text-gray-800 mt-0.5">{value}</dd>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'records' && (
          <div className="space-y-3">
            {recordsRes?.data?.length === 0 ? (
              <p className="text-sm text-gray-400">No treatment records yet.</p>
            ) : (
              recordsRes?.data?.map((r: any) => (
                <div key={r.id} className="border border-gray-100 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500">{r.created_at?.slice(0, 10)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      r.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>{r.status}</span>
                  </div>
                  {r.diagnosis && <p className="text-sm text-gray-700"><strong>Diagnosis:</strong> {r.diagnosis}</p>}
                  {r.procedure_performed && <p className="text-sm text-gray-600 mt-1">{r.procedure_performed}</p>}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'images' && (
          <div>
            {imagesRes?.data?.length === 0 ? (
              <p className="text-sm text-gray-400">No images uploaded yet.</p>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {imagesRes?.data?.map((img: any) => (
                  <div key={img.id} className="border border-gray-200 rounded-lg p-3 text-xs">
                    <p className="font-medium truncate">{img.file_name}</p>
                    <p className="text-gray-400 mt-1">{img.image_type} · {img.image_category}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'plans' && (
          <div className="space-y-3">
            {plansRes?.data?.length === 0 ? (
              <p className="text-sm text-gray-400">No treatment plans yet.</p>
            ) : (
              plansRes?.data?.map((plan: any) => (
                <div key={plan.id} className="border border-gray-100 rounded-lg p-4">
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

        {activeTab === 'chart' && (
          <p className="text-sm text-gray-400">
            Interactive dental chart coming soon — will render an SVG-based 32-tooth chart.
          </p>
        )}
      </div>
    </div>
  )
}
