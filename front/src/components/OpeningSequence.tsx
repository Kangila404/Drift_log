import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface SceneT {
  lines: string[]
  image?: string
  bg: string
}

const SCENES: SceneT[] = [
  {
    image: '/intro/introPage_1.png',
    bg: 'linear-gradient(to bottom, #2a1f3d 0%, #5a3a4a 45%, #c97a5a 82%, #e8a96a 100%)',
    lines: [
        '바람이 기분 좋게 불던 여름',
      '여느 날과 다름없는 저녁이었다.',
      '가족과 함께 한강의 노을을 바라보고 있었다.',
    ],
  },
  {
    image: '/intro/introPage_2.png',
    bg: 'linear-gradient(to bottom, #2e3a46 0%, #44525e 55%, #56646e 100%)',
    lines: [
      '빗방울이 하나둘 떨어지기 시작했다.',
      '어린 동생이 혹여나 감기가 걸릴까 걱정 되어',
      '우산을 사러 자리를 비웠다.',
    ],
  },
  {
    image: '/intro/introPage_3.png',
    bg: 'linear-gradient(to bottom, #08141d 0%, #122e38 50%, #18283a 100%)',
    lines: [
      '비가 내렸다.',
      '아주 내렸다.',
      '강이 범람하고, 거리가 물에 잠겼다.',
      '돌아왔을 때, 그곳엔 아무도 없었다.',
      '처음부터 아무것도 없었다는 듯이'
    ],
  },
  {
    image: '/intro/introPage_4.png',
    bg: 'linear-gradient(to bottom, #04080f 0%, #07111d 55%, #0a1c2a 100%)',
    lines: [
      '강가에 묶여 있던 낡은 돛단배 간신히 몸을 실었다.',
      '이젠 강가라고 할 수 있는 곳일까',
      '...',
      '이제 육지는 거의 남아 있지 않다.',
      '가족이 어디로 떠내려 갔는지 알 수 없다.',
      '구하러 가야한다.',
    ],
  },
]

export default function OpeningSequence({ onFinish }: { onFinish?: () => void }) {
  const [sceneIdx, setSceneIdx] = useState(0)
  const [lineIdx, setLineIdx] = useState(0)
  const [fading, setFading] = useState(false)

  const scene = SCENES[sceneIdx]
  const isLastLine = lineIdx >= scene.lines.length - 1
  const isLastScene = sceneIdx >= SCENES.length - 1

  const finish = () => {
    if (fading) return
    setFading(true)
    setTimeout(() => onFinish?.(), 1600)
  }

  const handleNext = () => {
    if (fading) return
    if (!isLastLine) {
      setLineIdx(i => i + 1)
    } else if (!isLastScene) {
      setSceneIdx(i => i + 1)
      setLineIdx(0)
    } else {
      finish()
    }
  }

  return (
    <motion.div
      className="fixed inset-0 z-[100] bg-black select-none cursor-pointer"
      onClick={handleNext}
      initial={{ opacity: 1 }}
      animate={{ opacity: fading ? 0 : 1 }}
      transition={{ duration: 1.6, ease: 'easeInOut' }}
    >
      {/* 배경 (이미지 or 그라데이션 폴백) */}
      <AnimatePresence mode="wait">
        <motion.div
          key={sceneIdx}
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.6, ease: 'easeInOut' }}
          style={{ background: scene.bg }}
        >
          {scene.image && (
            <img
              src={scene.image}
              alt=""
              className="w-full h-full object-cover"
              draggable={false}
              onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            />
          )}
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(to bottom, rgba(2,6,14,0.2) 0%, rgba(2,6,14,0) 35%, rgba(2,6,14,0.1) 60%, rgba(2,6,14,0.88) 100%)',
            }}
          />
        </motion.div>
      </AnimatePresence>

      {/* 대사 */}
      <div className="absolute bottom-0 left-0 right-0 p-12 flex flex-col items-center pointer-events-none">
        <AnimatePresence mode="wait">
          <motion.p
            key={`${sceneIdx}-${lineIdx}`}
            className="text-center font-serif text-[#cce8f5] leading-relaxed"
            style={{ fontSize: 'clamp(16px, 2.2vw, 26px)', maxWidth: 720, textShadow: '0 2px 12px rgba(0,0,0,0.85)' }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.8 }}
          >
            {scene.lines[lineIdx]}
          </motion.p>
        </AnimatePresence>
        <motion.p
          className="mt-8 text-[10px] font-mono text-[#4a7a94] tracking-[0.4em] uppercase"
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        >
          클릭하여 계속
        </motion.p>
      </div>

      {/* 건너뛰기 */}
      <button
        onClick={e => { e.stopPropagation(); finish() }}
        className="absolute top-6 right-6 px-4 py-2 text-[10px] font-mono text-[#3a6880] hover:text-[#7eb8d4] tracking-[0.3em] uppercase transition-colors z-10"
      >
        건너뛰기
      </button>
    </motion.div>
  )
}