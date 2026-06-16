import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { logout } from '../api/auth'

export default function ModeSelectPage() {
  const nav = useNavigate()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    const refreshToken = localStorage.getItem('refreshToken')
    try {
      if (refreshToken) await logout({ refreshToken })
    } catch {
      // 서버 실패해도 클라 토큰은 지우고 내보낸다
    } finally {
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      nav('/login')
    }
  }

  const modes = [
    { to: '/voyage', title: '항해', en: 'VOYAGE', desc: '물에 잠긴 도시를 항해하며 가족의 흔적을 찾습니다.', img: '/mode/voyage.png' },
    { to: '/study', title: '공부', en: 'STUDY', desc: '항해 시간 동안 백색 소음을 들으며 집중하세요.', img: '/mode/study.png' },
  ]

  return (
    <div className="relative w-full min-h-[100dvh] flex flex-col items-center justify-center gap-6 md:gap-10 px-5 py-10 overflow-hidden">
      {/* ── 배경 (깊은 바다 분위기) ── */}
      <div className="absolute inset-0 -z-10" style={{ background: '#07111d' }} />
      {/* 위에서 내려오는 옅은 빛 */}
      <div className="absolute inset-0 -z-10" style={{
        background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(74,154,187,0.12) 0%, transparent 60%)'
      }} />
      {/* 아래 심해 어둠 */}
      <div className="absolute inset-0 -z-10" style={{
        background: 'linear-gradient(to bottom, transparent 40%, rgba(2,6,14,0.6) 100%)'
      }} />
      {/* 은은한 물결 그리드 */}
      <svg className="absolute inset-0 -z-10 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="bgGrid" width="44" height="44" patternUnits="userSpaceOnUse">
            <path d="M 44 0 L 0 0 0 44" fill="none" stroke="#4a9abb" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#bgGrid)" />
      </svg>

      {/* ── 로그아웃 버튼 ── */}
      <button
        onClick={() => setConfirmOpen(true)}
        className="absolute top-5 right-5 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                   border border-[#1a4a64]/40 hover:border-[#7ec0d2]/70 active:border-[#7ec0d2]/70
                   text-[#7ec0d2]/60 hover:text-[#7ec0d2] transition-colors duration-300
                   text-[10px] font-mono tracking-[0.3em] uppercase"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        로그아웃
      </button>

      {/* ── 타이틀 ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
        className="flex flex-col items-center gap-2 shrink-0"
      >
        <p className="text-[22px] md:text-[26px] font-serif text-[#a8d4e8] tracking-[0.4em] md:tracking-[0.5em] uppercase">DriftLog</p>
        <p className="text-[10px] font-mono text-[#2a5a74] tracking-[0.4em] uppercase">모드를 선택하세요</p>
      </motion.div>

      {/* ── 카드 ── */}
      <div className="flex flex-col md:flex-row gap-4 md:gap-5 w-full max-w-3xl">
        {modes.map((m, i) => (
          <motion.button
            key={m.to}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.15, duration: 0.6 }}
            onClick={() => nav(m.to)}
            className="group relative flex-1 rounded-2xl overflow-hidden border border-[#1a4a64]/40 hover:border-[#4a9abb]/70 active:border-[#4a9abb]/70 transition-colors duration-500
                       aspect-[16/10] md:aspect-auto md:h-[440px]"
          >
            <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #0a1828 0%, #050e18 100%)' }} />
            <img
              src={m.img} alt={m.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              draggable={false}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden' }}
            />
            <div className="absolute inset-0"
              style={{ background: 'linear-gradient(to top, rgba(3,9,16,0.92) 0%, rgba(3,9,16,0.3) 50%, rgba(3,9,16,0.05) 100%)' }} />
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
              style={{ boxShadow: 'inset 0 0 90px rgba(74,154,187,0.28)' }} />

            <div className="absolute inset-x-0 bottom-0 flex flex-col items-center pb-6 md:pb-10 px-6 gap-1.5">
              <p className="text-[9px] md:text-[10px] font-mono text-[#7eb8d4]/70 tracking-[0.5em] uppercase">{m.en}</p>
              <h2 className="text-[24px] md:text-[30px] font-serif text-[#cce8f5] tracking-[0.4em]" style={{ textShadow: '0 2px 16px rgba(0,0,0,0.9)' }}>
                {m.title}
              </h2>
              <p className="text-[10px] md:text-[11px] text-[#a8d4e8]/70 font-light leading-relaxed text-center max-w-[240px] mt-1
                            md:opacity-0 md:translate-y-2 md:group-hover:opacity-100 md:group-hover:translate-y-0 transition-all duration-500">
                {m.desc}
              </p>
            </div>
          </motion.button>
        ))}
      </div>

      {/* ── 로그아웃 확인 모달 ── */}
      <AnimatePresence>
        {confirmOpen && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center px-6"
            onClick={() => !loggingOut && setConfirmOpen(false)}
          >
            {/* 딤 */}
            <div className="absolute inset-0" style={{ background: 'rgba(3,9,16,0.66)', backdropFilter: 'blur(12px)' }} />

            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-[360px] rounded-[28px] overflow-hidden"
              style={{
                background: 'linear-gradient(165deg, rgba(16,32,46,0.88) 0%, rgba(7,17,29,0.92) 100%)',
                border: '1px solid rgba(126,192,210,0.14)',
                boxShadow: '0 24px 60px -12px rgba(0,0,0,0.7), inset 0 1px 0 rgba(126,192,210,0.08)',
                backdropFilter: 'blur(24px)',
              }}
            >
              {/* 상단 하이라이트 글로우 */}
              <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-56 h-56 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(126,192,210,0.1) 0%, transparent 70%)' }} />

              <div className="relative flex flex-col items-center text-center px-8 pt-9 pb-7">
                {/* 아이콘 배지 */}
                <div className="flex items-center justify-center w-14 h-14 rounded-2xl mb-5"
                  style={{
                    background: 'linear-gradient(160deg, rgba(126,192,210,0.16) 0%, rgba(126,192,210,0.04) 100%)',
                    border: '1px solid rgba(126,192,210,0.2)',
                    boxShadow: 'inset 0 1px 0 rgba(126,192,210,0.12)',
                  }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#a8d4e8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </div>

                <h3 className="text-[18px] font-semibold text-[#e6f3fa] tracking-[-0.01em]">로그아웃</h3>
                <p className="text-[13px] text-[#a8d4e8]/45 font-normal leading-relaxed mt-2 max-w-[240px]">
                  지금 로그아웃하시겠어요? 항해 기록은 그대로 저장됩니다.
                </p>

                <div className="flex gap-2.5 w-full mt-7">
                  <button
                    onClick={() => setConfirmOpen(false)}
                    disabled={loggingOut}
                    className="flex-1 py-3 rounded-2xl text-[13.5px] font-medium text-[#a8d4e8]/70 hover:text-[#e6f3fa]
                               transition-all duration-200 disabled:opacity-40"
                    style={{ background: 'rgba(126,192,210,0.06)', border: '1px solid rgba(126,192,210,0.12)' }}
                  >
                    취소
                  </button>
                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="flex-1 py-3 rounded-2xl text-[13.5px] font-semibold text-[#04141f]
                               transition-all duration-200 disabled:opacity-50 active:scale-[0.98]"
                    style={{
                      background: 'linear-gradient(180deg, #9fd6e6 0%, #7ec0d2 100%)',
                      boxShadow: '0 6px 16px -4px rgba(126,192,210,0.45), inset 0 1px 0 rgba(255,255,255,0.3)',
                    }}
                  >
                    {loggingOut ? '나가는 중…' : '로그아웃'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}