export type UserRole = 'admin' | 'doctor' | 'receptionist'

export interface User {
  id: string
  name: string
  mobile: string
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Patient {
  id: string
  patient_number: string | null
  name: string
  mobile: string
  email: string | null
  date_of_birth: string | null
  gender: string | null
  address: string | null
  blood_group: string | null
  allergies: string | null
  current_medications: string | null
  medical_history: string | null
  emergency_contact_name: string | null
  emergency_contact_mobile: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type AppointmentStatus =
  | 'scheduled'
  | 'confirmed'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'

export interface Appointment {
  id: string
  patient_id: string
  doctor_id: string
  treatment_type_id: string | null
  appointment_date: string
  appointment_time: string
  duration_minutes: number
  status: AppointmentStatus
  notes: string | null
  whatsapp_confirmation_sent: boolean
  whatsapp_reminder_sent: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export type TreatmentRecordStatus = 'planned' | 'in_progress' | 'completed' | 'cancelled'

export interface TreatmentRecord {
  id: string
  patient_id: string
  appointment_id: string | null
  doctor_id: string
  treatment_type_id: string | null
  tooth_numbers: number[]
  quadrant: string | null
  notes: string | null
  diagnosis: string | null
  procedure_performed: string | null
  medications_prescribed: MedicationItem[]
  next_followup_recommendation: string | null
  status: TreatmentRecordStatus
  doctor_initials: string | null
  created_at: string
  updated_at: string
}

export interface MedicationItem {
  name: string
  dosage: string | null
  duration: string | null
}

export interface PatientImage {
  id: string
  patient_id: string
  treatment_record_id: string | null
  file_name: string
  file_type: 'jpeg' | 'png' | 'dicom' | 'pdf'
  file_size_bytes: number | null
  image_category: string
  image_type: string
  tooth_numbers: number[]
  description: string | null
  metadata: Record<string, unknown>
  uploaded_by: string
  created_at: string
}

export type TreatmentPlanStatus = 'proposed' | 'approved' | 'in_progress' | 'completed' | 'cancelled'

export interface TreatmentPlan {
  id: string
  patient_id: string
  doctor_id: string
  title: string
  description: string | null
  status: TreatmentPlanStatus
  patient_consent: boolean
  consent_date: string | null
  items: TreatmentPlanItem[]
  created_at: string
  updated_at: string
}

export interface TreatmentPlanItem {
  id: string
  treatment_plan_id: string
  treatment_type_id: string | null
  tooth_numbers: number[]
  description: string | null
  phase_number: number
  sequence_order: number
  estimated_cost: string | null
  estimated_duration_minutes: number | null
  status: string
  appointment_id: string | null
  created_at: string
  updated_at: string
}

export interface ToothState {
  id: string
  patient_id: string
  tooth_number: number
  conditions: string[]
  surfaces: Record<string, string | null>
  notes: string | null
  recorded_by: string
  updated_at: string
}

export interface DentalChart {
  patient_id: string
  teeth: Record<number, ToothState>
}

export interface DashboardStats {
  today_appointments: number
  today_completed: number
  today_cancelled: number
  total_patients: number
  upcoming_7_days: number
}

export interface Pagination {
  page: number
  per_page: number
  total: number
  pages: number
}

export interface PaginatedResponse<T> {
  success: boolean
  data: T[]
  pagination: Pagination
}
