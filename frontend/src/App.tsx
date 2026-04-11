import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import Layout from '@/components/layout/Layout'
import LoginPage from '@/pages/LoginPage'
import DashboardPage from '@/pages/DashboardPage'
import AppointmentsPage from '@/pages/AppointmentsPage'
import PatientsPage from '@/pages/PatientsPage'
import PatientProfilePage from '@/pages/PatientProfilePage'
import UsersPage from '@/pages/UsersPage'
import TreatmentTypesPage from '@/pages/TreatmentTypesPage'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user)
  return user?.role === 'admin' ? <>{children}</> : <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="appointments" element={<AppointmentsPage />} />
          <Route path="patients" element={<PatientsPage />} />
          <Route path="patients/:patientId" element={<PatientProfilePage />} />
          <Route path="users" element={<AdminRoute><UsersPage /></AdminRoute>} />
          <Route path="treatment-types" element={<AdminRoute><TreatmentTypesPage /></AdminRoute>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
