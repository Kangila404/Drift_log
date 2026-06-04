import { Navigate } from 'react-router-dom'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const accessToken = localStorage.getItem('accessToken')
  return accessToken ? <>{children}</> : <Navigate to="/login" replace />
}

export default ProtectedRoute