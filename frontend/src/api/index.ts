import client from './client'

// ── Auth ────────────────────────────────────────────────────────
export const authApi = {
  login: (mobile: string, pin: string) =>
    client.post('/auth/login', { mobile, pin }),
  me: () => client.get('/auth/me'),
  changePin: (old_pin: string, new_pin: string) =>
    client.put('/auth/change-pin', { old_pin, new_pin }),
}

// ── Users ───────────────────────────────────────────────────────
export const usersApi = {
  list: (params?: object) => client.get('/users', { params }),
  create: (data: object) => client.post('/users', data),
  get: (id: string) => client.get(`/users/${id}`),
  update: (id: string, data: object) => client.put(`/users/${id}`, data),
  deactivate: (id: string) => client.patch(`/users/${id}/deactivate`),
}

// ── Treatment Types ─────────────────────────────────────────────
export const treatmentTypesApi = {
  list: () => client.get('/treatment-types'),
  create: (data: object) => client.post('/treatment-types', data),
  update: (id: string, data: object) => client.put(`/treatment-types/${id}`, data),
  delete: (id: string) => client.delete(`/treatment-types/${id}`),
}

// ── Patients ────────────────────────────────────────────────────
export const patientsApi = {
  list: (params?: object) => client.get('/patients', { params }),
  create: (data: object) => client.post('/patients', data),
  get: (id: string) => client.get(`/patients/${id}`),
  update: (id: string, data: object) => client.put(`/patients/${id}`, data),
}

// ── Appointments ────────────────────────────────────────────────
export const appointmentsApi = {
  list: (params?: object) => client.get('/appointments', { params }),
  create: (data: object) => client.post('/appointments', data),
  get: (id: string) => client.get(`/appointments/${id}`),
  update: (id: string, data: object) => client.put(`/appointments/${id}`, data),
  updateStatus: (id: string, status: string) =>
    client.patch(`/appointments/${id}/status`, { status }),
  cancel: (id: string) => client.delete(`/appointments/${id}`),
  sendWhatsAppConfirm: (id: string) =>
    client.post(`/appointments/${id}/whatsapp-confirm`),
  sendWhatsAppReminder: (id: string) =>
    client.post(`/appointments/${id}/whatsapp-reminder`),
}

// ── Treatment Records ───────────────────────────────────────────
export const recordsApi = {
  list: (patientId: string, params?: object) =>
    client.get(`/patients/${patientId}/records`, { params }),
  create: (patientId: string, data: object) =>
    client.post(`/patients/${patientId}/records`, data),
  get: (patientId: string, id: string) =>
    client.get(`/patients/${patientId}/records/${id}`),
  update: (patientId: string, id: string, data: object) =>
    client.put(`/patients/${patientId}/records/${id}`, data),
  softDelete: (patientId: string, id: string, reason: string) =>
    client.delete(`/patients/${patientId}/records/${id}`, { data: { reason } }),
}

// ── Patient Images ──────────────────────────────────────────────
export const imagesApi = {
  list: (patientId: string, params?: object) =>
    client.get(`/patients/${patientId}/images`, { params }),
  upload: (patientId: string, formData: FormData) =>
    client.post(`/patients/${patientId}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getSignedUrl: (patientId: string, imageId: string) =>
    client.get(`/patients/${patientId}/images/${imageId}/url`),
  update: (patientId: string, imageId: string, data: object) =>
    client.patch(`/patients/${patientId}/images/${imageId}`, data),
  softDelete: (patientId: string, imageId: string, reason: string) =>
    client.delete(`/patients/${patientId}/images/${imageId}`, { data: { reason } }),
}

// ── Dental Chart ────────────────────────────────────────────────
export const dentalChartApi = {
  get: (patientId: string) => client.get(`/patients/${patientId}/dental-chart`),
  updateTooth: (patientId: string, toothNumber: number, data: object) =>
    client.put(`/patients/${patientId}/dental-chart/${toothNumber}`, data),
}

// ── Treatment Plans ─────────────────────────────────────────────
export const plansApi = {
  list: (patientId: string) => client.get(`/patients/${patientId}/plans`),
  create: (patientId: string, data: object) =>
    client.post(`/patients/${patientId}/plans`, data),
  get: (patientId: string, planId: string) =>
    client.get(`/patients/${patientId}/plans/${planId}`),
  update: (patientId: string, planId: string, data: object) =>
    client.put(`/patients/${patientId}/plans/${planId}`, data),
  addItem: (patientId: string, planId: string, data: object) =>
    client.post(`/patients/${patientId}/plans/${planId}/items`, data),
  updateItem: (patientId: string, planId: string, itemId: string, data: object) =>
    client.put(`/patients/${patientId}/plans/${planId}/items/${itemId}`, data),
  deleteItem: (patientId: string, planId: string, itemId: string) =>
    client.delete(`/patients/${patientId}/plans/${planId}/items/${itemId}`),
}

// ── Dashboard ───────────────────────────────────────────────────
export const dashboardApi = {
  stats: () => client.get('/dashboard/stats'),
  todayAppointments: () => client.get('/dashboard/appointments/today'),
}

// ── Audit Logs ──────────────────────────────────────────────────
export const auditApi = {
  list: (params?: object) => client.get('/audit-logs', { params }),
  forPatient: (patientId: string) => client.get(`/audit-logs/patient/${patientId}`),
}
