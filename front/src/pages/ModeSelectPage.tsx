import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function ModeSelectPage() {
  const nav = useNavigate()
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
    </div>
  )
}