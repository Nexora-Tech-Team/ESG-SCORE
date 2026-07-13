import { lazy, Suspense } from 'react'
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import type { Role } from '@/types'

function RequireAuth({ roles }: { roles?: Role[] }) {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/unauthorized" replace />
  return <Outlet />
}

function RoleRedirect() {
  const user = useAuthStore((s) => s.user)
  if (!user) return <Navigate to="/login" replace />
  return <Navigate to={`/${user.role}/dashboard`} replace />
}

function Page({ component: C }: { component: React.LazyExoticComponent<() => React.ReactElement> }) {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center text-sm text-[#7d9aa2]">Loading...</div>}>
      <C />
    </Suspense>
  )
}

const Login = lazy(() => import('@/pages/auth/Login'))
const Register = lazy(() => import('@/pages/auth/Register'))
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'))
const ResetPassword = lazy(() => import('@/pages/auth/ResetPassword'))
const Dashboard = lazy(() => import('@/pages/dashboard/Dashboard'))
const AssessmentDetail = lazy(() => import('@/pages/assessment/AssessmentDetail'))
const Unauthorized = lazy(() => import('@/pages/system/Unauthorized'))

export const router = createBrowserRouter([
  { path: '/', element: <RoleRedirect /> },
  { path: '/login', element: <Page component={Login} /> },
  { path: '/register', element: <Page component={Register} /> },
  { path: '/forgot-password', element: <Page component={ForgotPassword} /> },
  { path: '/reset-password/:token', element: <Page component={ResetPassword} /> },
  { path: '/unauthorized', element: <Page component={Unauthorized} /> },
  {
    element: <RequireAuth roles={['admin']} />,
    children: [
      { path: '/admin/dashboard', element: <Page component={Dashboard} /> },
      { path: '/admin/assessment/:assessmentId', element: <Page component={AssessmentDetail} /> },
    ],
  },
  {
    element: <RequireAuth roles={['asesor']} />,
    children: [
      { path: '/asesor/dashboard', element: <Page component={Dashboard} /> },
      { path: '/asesor/assessment/:assessmentId', element: <Page component={AssessmentDetail} /> },
    ],
  },
  {
    element: <RequireAuth roles={['juri']} />,
    children: [
      { path: '/juri/dashboard', element: <Page component={Dashboard} /> },
      { path: '/juri/assessment/:assessmentId', element: <Page component={AssessmentDetail} /> },
    ],
  },
  {
    element: <RequireAuth roles={['peserta']} />,
    children: [
      { path: '/peserta/dashboard', element: <Page component={Dashboard} /> },
      { path: '/peserta/assessment/:assessmentId', element: <Page component={AssessmentDetail} /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
], {
  basename: import.meta.env.BASE_URL,
})
