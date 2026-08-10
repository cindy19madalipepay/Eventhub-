import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from "./components/DashboardLayout";

// Auth pages
import Login          from './pages/auth/Login';
import Register       from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';

// Public check-in page (what the poster QR code links to)
import CheckIn from './pages/CheckIn';

// Admin pages
import AdminDashboard     from './pages/admin/AdminDashboard';
import CreateEvent        from './pages/admin/CreateEvent';
import EventPoster        from './pages/admin/EventPoster';
import ManageEvents       from './pages/admin/ManageEvents';
import PaymentValidation  from './pages/admin/PaymentValidation';
import AttendanceReport   from './pages/admin/AttendanceReport';
import EvaluationResults  from './pages/admin/EvaluationResults';
import ManageUsers        from './pages/admin/ManageUsers';

// Department Head pages
import DeptDashboard   from './pages/department-head/DeptDashboard';
import DeptReports     from './pages/department-head/DeptReports';
// DeptAttendance.jsx is no longer used — /dept/attendance now reuses the
// same AttendanceReport component as admin (see import above).

// Student pages (NEW - 3 only)
import Notifications from './pages/student/Notifications';
import MyEvents      from './pages/student/MyEvents';
import History       from './pages/student/History';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        <Routes>

          <Route path="/"                element={<Navigate to="/login" replace />} />
          <Route path="/login"           element={<Login />} />
          <Route path="/register"        element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          {/* ── QR Check-in Route ────────────────────────── */}
          {/* Public on purpose — NOT wrapped in ProtectedRoute. It has to load
              for both logged-in and logged-out scanners so it can decide for
              itself where to send each one (My Events vs Login). */}
          <Route path="/checkin/:eventId" element={<CheckIn />} />

          {/* ── Admin Routes ─────────────────────────────── */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard"         element={<AdminDashboard />} />
            <Route path="events"            element={<ManageEvents />} />
            <Route path="create-event"      element={<CreateEvent />} />
            <Route path="events/:id/poster" element={<EventPoster />} />
            <Route path="receipts"          element={<PaymentValidation />} />
            <Route path="attendance"        element={<AttendanceReport />} />
            <Route path="evaluation"        element={<EvaluationResults />} />
            <Route path="users"             element={<ManageUsers />} />
          </Route>

          {/* ── Department Head Routes ───────────────────── */}
          {/* attendance reuses the exact same AttendanceReport component as
              admin — it detects role === 'department_head' internally and
              auto-locks to that user's own department (no picker shown). */}
          <Route path="/dept" element={
            <ProtectedRoute allowedRoles={['department_head']}>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard"   element={<DeptDashboard />} />
            <Route path="attendance"  element={<AttendanceReport />} />
            <Route path="reports"     element={<DeptReports />} />
            <Route path="evaluation"  element={<EvaluationResults />} />
          </Route>

          {/* ── Student Routes (student, student_leader, alumni, stakeholder) ── */}
          <Route path="/student" element={
            <ProtectedRoute allowedRoles={['student', 'student_leader', 'alumni', 'stakeholder']}>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="notifications" replace />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="my-events"     element={<MyEvents />} />
            <Route path="history"       element={<History />} />
          </Route>

          {/* ── Fallback Routes ──────────────────────────── */}
          <Route path="/unauthorized" element={
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', flexDirection:'column', gap:16 }}>
              <h2>Access Denied</h2>
              <p>You don't have permission to view this page.</p>
              <a href="/login" style={{ color:'#0f3460', fontWeight:600 }}>Go back to Login</a>
            </div>
          } />

          <Route path="*" element={
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', flexDirection:'column', gap:16 }}>
              <h2>404 — Page Not Found</h2>
              <a href="/login" style={{ color:'#0f3460', fontWeight:600 }}>Go to Login</a>
            </div>
          } />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;