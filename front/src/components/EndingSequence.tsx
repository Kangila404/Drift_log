import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { submitEndingFeedback } from '../api/feedback'

interface Scene {
  image: string
  lines: string[]
}

const SCENES: Scene[] = [
  {
    image: '/ending/endingPage_1.png',
    lines: [
      '산 자락에 배를 정박시켰다.',
      '지금껏 마치 역마살이 낀 듯 떠돌아 이곳에 왔다.',
      '그 모든 곳에 그들이 남긴 흔적이 있었다.',
      '오늘이 긴 방황의 마지막이길 바란다.',
    ],
  },
  {
    image: '/ending/endingPage_2.png',
    lines: [
      '산을 오름에도 힘이 부치지 않는다.',
      '너무 늦은 건 아닐까 생각이 들어 겁이 난다.',
    ],
  },
  {
    image: '/ending/endingPage_3.png',
    lines: [
      '산 정상에 작은 천막이 보였다.',
      '어설픈 솜씨',
      '인기척이 들리는 듯하다.',
    ],
  },
  {
    image: '/ending/endingPage_4.png',
    lines: [
      '어두운 밤이면 배의 조명 등불에 기대어 바다를 지나 왔다.',
      '옛 고전의 말처럼 스스로의 등불에 기대어 어둠을 밝히기엔 나는 어리석다.',
      '나는 편히 내 한 몸 늬울 곳이 필요했다.',
      '단지 그뿐이였다.'
    ],
  },
]

type Phase = 'scenes' | 'title' | 'feedback' | 'thanks'

export default function EndingSequence({
  onFinish,
  showFeedback = true,
}: {
  onFinish?: () => void
  showFeedback?: boolean
}) {
  const [sceneIdx, setSceneIdx] = useState(0)
  const [lineIdx, setLineIdx] = useState(0)
  const [phase, setPhase] = useState<Phase>('scenes')

  const [feedback, setFeedback] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [thanksMsg, setThanksMsg] = useState('')

  const scene = SCENES[sceneIdx]
  const isLastLine = lineIdx >= scene.lines.length - 1
  const isLastScene = sceneIdx >= SCENES.length - 1

  const handleNext = () => {
    if (phase !== 'scenes') return
    if (!isLastLine) {
      setLineIdx(i => i + 1)
    } else if (!isLastScene) {
      setSceneIdx(i => i + 1)
      setLineIdx(0)
    } else {
      setPhase('title')
      if (showFeedback) {
        setTimeout(() => setPhase('feedback'), 2600)
      } else {
        // 다시 보기 — 피드백 없이 타이틀만 보여주고 종료
        setTimeout(() => onFinish?.(), 2600)
      }
    }
  }

  const handleSubmit = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      const msg = await submitEndingFeedback(feedback.trim())
      setThanksMsg(msg || '소중한 이야기 고맙습니다.')
    } catch {
      setThanksMsg('소중한 이야기 고맙습니다.')
    }
    setPhase('thanks')
    setTimeout(() => onFinish?.(), 3000)
  }

  const handleSkip = () => {
    setThanksMsg('긴 항해, 수고하셨습니다.')
    setPhase('thanks')
    setTimeout(() => onFinish?.(), 2600)
  }

  return (
    <div
      className={`fixed inset-0 z-[100] bg-black select-none ${phase === 'scenes' ? 'cursor-pointer' : ''}`}
      onClick={phase === 'scenes' ? handleNext : undefined}
    >
      {/* 장면 이미지 */}
      <AnimatePresence mode="wait">
        {phase === 'scenes' && (
          <motion.div
            key={sceneIdx}
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.6, ease: 'easeInOut' }}
          >
            <img src={scene.image} alt="" className="w-full h-full object-cover" draggable={false} />
            <div className="absolute inset-0" style={{
              background: 'linear-gradient(to bottom, rgba(2,6,14,0.2) 0%, rgba(2,6,14,0) 35%, rgba(2,6,14,0.1) 60%, rgba(2,6,14,0.85) 100%)',
            }} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 대사 */}
      {phase === 'scenes' && (
        <div className="absolute bottom-0 left-0 right-0 p-12 flex flex-col items-center pointer-events-none">
          <AnimatePresence mode="wait">
            <motion.p
              key={`${sceneIdx}-${lineIdx}`}
              className="text-center font-serif text-[#cce8f5] leading-relaxed"
              style={{ fontSize: 'clamp(16px, 2.2vw, 26px)', maxWidth: 720, textShadow: '0 2px 12px rgba(0,0,0,0.8)' }}
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
      )}

      {/* 타이틀 */}
      <AnimatePresence>
        {phase === 'title' && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center bg-black"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 1.4 }}
          >
            <motion.p
              className="font-serif text-[#a8d4e8] tracking-[0.5em]"
              style={{ fontSize: 'clamp(18px, 3vw, 32px)' }}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6, duration: 1.4 }}
            >
              DriftLog
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 피드백 폼 */}
      <AnimatePresence>
        {phase === 'feedback' && (
          <motion.div
            className="absolute inset-0 flex flex-col items-center justify-center bg-black px-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 1 }}
          >
            <motion.div
              className="w-full flex flex-col items-center"
              style={{ maxWidth: 520 }}
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 1 }}
            >
              <p className="font-serif text-[#a8d4e8] mb-3 text-center" style={{ fontSize: 'clamp(16px, 2vw, 22px)' }}>
                재밌게 플레이 해주셨나요?
              </p>
              <p className="text-[12px] font-mono text-[#7eb8d4] tracking-widest text-center leading-relaxed mb-1">
                여러분의 피드백을 남겨 주세요.
              </p>
              <p className="text-[11px] font-mono text-[#4a7a94] tracking-widest text-center leading-relaxed mb-6">
                최대한 빠르게 서비스에 반영해드리겠습니다.
              </p>
              <textarea
                value={feedback}
                onChange={e => setFeedback(e.target.value)}
                maxLength={300}
                rows={4}
                placeholder="이 여정에 대한 감상을 들려주세요..."
                className="w-full bg-[rgba(122,184,200,0.05)] border border-[rgba(122,184,200,0.2)] rounded text-[13px] text-[#cce8f5] px-4 py-3 outline-none focus:border-[rgba(122,184,200,0.5)] placeholder-[#2a5a74] resize-none leading-relaxed"
              />
              <div className="w-full flex justify-end mt-1">
                <span className="text-[9px] font-mono text-[#2a5a74]">{feedback.length}/300</span>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSkip}
                  className="px-6 py-2 text-[11px] font-mono text-[#3a6880] hover:text-[#7eb8d4] tracking-widest uppercase transition-colors"
                >
                  건너뛰기
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || !feedback.trim()}
                  className="px-8 py-2 border border-[rgba(122,184,200,0.4)] rounded text-[11px] font-mono text-[#cce8f5] hover:bg-[rgba(122,184,200,0.1)] hover:border-[rgba(122,184,200,0.7)] tracking-widest uppercase transition-all disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  {submitting ? '전하는 중' : '남기기'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 감사 */}
      <AnimatePresence>
        {phase === 'thanks' && (
          <motion.div
            className="absolute inset-0 flex items-center justify-center bg-black px-6"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
          >
            <motion.p
              className="text-center font-serif text-[#a8d4e8] tracking-[0.3em] leading-relaxed"
              style={{ fontSize: 'clamp(15px, 2vw, 22px)', maxWidth: 600 }}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 1.2 }}
            >
              {thanksMsg}
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}