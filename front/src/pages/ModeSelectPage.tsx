import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

export default function ModeSelectPage() {
  const nav = useNavigate()
  const modes = [
    { to: '/voyage', title: '항해', en: 'VOYAGE', desc: '잠긴 도시를 지나 가족의 흔적을 따라 항해합니다.', img: '/mode/voyage.png' },
    { to: '/study', title: '공부', en: 'STUDY', desc: '배 위에서 조용히 시간을 쌓습니다.', img: '/mode/study.png' },
  ]

  return (
    <div className="w-full min-h-[100dvh] bg-[#07111d] flex flex-col items-center justify-center gap-6 md:gap-10 px-5 py-10">
      {/* 타이틀 */}
      <motion.div
        initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}
        className="flex flex-col items-center gap-2 shrink-0"
      >
        <p className="text-[20px] md:text-[24px] font-serif text-[#a8d4e8] tracking-[0.4em] md:tracking-[0.5em] uppercase">DriftLog</p>
        <p className="text-[10px] font-mono text-[#2a5a74] tracking-[0.4em] uppercase">모드를 선택하세요</p>
      </motion.div>

      {/* 카드 — 모바일 세로 쌓기 / PC 가로 */}
      <div className="flex flex-col md:flex-row gap-4 md:gap-5 w-full max-w-3xl">
        {modes.map((m, i) => (
          <motion.button
            key={m.to}
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.15, duration: 0.6 }}
            onClick={() => nav(m.to)}
            className="group relative flex-1 h-[160px] md:h-[420px] rounded-2xl overflow-hidden border border-[#1a4a64]/40 hover:border-[#4a9abb]/70 active:border-[#4a9abb]/70 transition-colors duration-500"
          >
            {/* 배경 이미지 (없으면 그라데이션 폴백) */}
            <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, #0a1828 0%, #050e18 100%)' }} />
            <img
              src={m.img}
              alt={m.title}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              draggable={false}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden' }}
            />

            {/* 어둠 그라데이션 */}
            <div
              className="absolute inset-0"
              style={{ background: 'linear-gradient(to top, rgba(3,9,16,0.95) 0%, rgba(3,9,16,0.4) 50%, rgba(3,9,16,0.15) 100%)' }}
            />

            {/* 호버 글로우 (PC만 의미있음) */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
              style={{ boxShadow: 'inset 0 0 80px rgba(74,154,187,0.25)' }} />

            {/* 텍스트 */}
            <div className="absolute inset-0 flex flex-col items-center justify-center md:justify-end md:pb-10 px-5 gap-1.5 md:gap-2">
              <p className="text-[9px] md:text-[10px] font-mono text-[#7eb8d4]/70 tracking-[0.4em] md:tracking-[0.5em] uppercase">{m.en}</p>
              <h2 className="text-[24px] md:text-[28px] font-serif text-[#cce8f5] tracking-[0.35em] md:tracking-[0.4em]" style={{ textShadow: '0 2px 16px rgba(0,0,0,0.9)' }}>
                {m.title}
              </h2>
              {/* 설명: 모바일은 항상 보임(작게), PC는 호버 시 */}
              <p className="text-[10px] md:text-[11px] text-[#a8d4e8]/70 font-light leading-relaxed text-center max-w-[240px]
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