import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface Props {
  cityName: string
  imageUrl: string
  description: string
  onFinish: () => void
}

export default function CityArrivalSequence({ cityName, imageUrl, description, onFinish }: Props) {
  // description을 문장(. 기준)으로 쪼개서 한 줄씩
  const lines = description.split(/(?<=[.!?])\s+/).filter(Boolean)
  const [idx, setIdx] = useState(0)
  const isLast = idx >= lines.length - 1

  const handleNext = () => {
    if (!isLast) setIdx(i => i + 1)
    else onFinish()
  }

  return (
    <div
      className="fixed inset-0 z-[90] bg-black cursor-pointer select-none"
      onClick={handleNext}
    >
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0, scale: 1.04 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 2, ease: 'easeOut' }}
      >
        <img src={imageUrl} alt={cityName} className="w-full h-full object-cover" draggable={false} />
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(to bottom, rgba(2,6,14,0.35) 0%, rgba(2,6,14,0.05) 30%, rgba(2,6,14,0.1) 55%, rgba(2,6,14,0.9) 100%)',
        }} />
      </motion.div>

      {/* 도시 이름 */}
      <motion.div
        className="absolute top-[18%] left-0 right-0 flex flex-col items-center pointer-events-none"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 1.2 }}
      >
        <p className="text-[11px] font-mono text-[#7eb8d4] tracking-[0.5em] uppercase mb-2">처음 도착한 도시</p>
        <h1 className="font-serif text-[#cce8f5] tracking-[0.3em]" style={{ fontSize: 'clamp(28px, 5vw, 56px)', textShadow: '0 2px 20px rgba(0,0,0,0.8)' }}>
          {cityName}
        </h1>
      </motion.div>

      {/* 설명 텍스트 (클릭으로 한 문장씩) */}
      <div className="absolute bottom-0 left-0 right-0 p-12 flex flex-col items-center pointer-events-none">
        <AnimatePresence mode="wait">
          <motion.p
            key={idx}
            className="text-center font-serif text-[#cce8f5] leading-relaxed"
            style={{ fontSize: 'clamp(15px, 2.2vw, 24px)', maxWidth: 720, textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.8 }}
          >
            {lines[idx]}
          </motion.p>
        </AnimatePresence>
        <motion.p
          className="mt-8 text-[10px] font-mono text-[#4a7a94] tracking-[0.4em] uppercase"
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          {isLast ? '클릭하여 입항' : '클릭하여 계속'}
        </motion.p>
      </div>
    </div>
  )
}