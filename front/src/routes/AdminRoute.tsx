import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { apiClient } from '../api/client'

type GateState = 'loading' | 'ok' | 'notAdmin' | 'unauth'

export default function AdminRoute({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GateState>('loading')

  useEffect(() => {
    apiClient.get('/users/me')
      .then(res => setState(res.data.userRole === 'ADMIN' ? 'ok' : 'notAdmin'))
      .catch(err => setState(err?.response?.status === 401 ? 'unauth' : 'notAdmin'))
  }, [])

  if (state === 'loading') {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-[#040d16]">
        <span className="text-[11px] font-mono text-[#2a5a74] tracking-[0.4em] uppercase animate-pulse">
          확인 중...
        </span>
      </div>
    )
  }
  if (state === 'unauth') return <Navigate to="/login" replace />
  if (state === 'notAdmin') return <Navigate to="/" replace />
  return <>{children}</>
}