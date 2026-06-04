import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { signup } from "../api/auth";
import OceanBackground from "../components/OceanBackground";
import { getTodayWeather } from "../api/weather";
import { WEATHER_MAP } from "../constants/weather";

export default function SignupPage() {
  const navigate = useNavigate()
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [weatherLabel, setWeatherLabel] = useState('잔잔한 수면')

  const handleSignup = async () => {
    if (password !== passwordConfirm) {
      alert("비밀번호가 일치하지 않습니다.");
      return;
    }
    try {
      const result = await signup({ email, name, password, passwordConfirm });
      localStorage.setItem("accessToken", result.accessToken);
      localStorage.setItem("refreshToken", result.refreshToken);
      localStorage.setItem("justLoggedIn", "1");
      navigate("/");
    } catch (e) {
      console.error("회원가입 실패:", e);
      alert("회원가입에 실패했습니다. 다시 시도해주세요.");
    }
  }

  const [displayText, setDisplayText] = useState('')
  const fullText = '새로운 항해자 등록'

  useEffect(() => {
    let index = 0
    const timer = setInterval(() => {
      if (index < fullText.length) {
        setDisplayText(fullText.slice(0, index + 1))
        index++
      } else {
        clearInterval(timer)
      }
    }, 80)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    getTodayWeather()
      .then(w => setWeatherLabel(WEATHER_MAP[w.weatherId]))
      .catch(() => {})
  }, [])

  return (
    <div className="w-full min-h-[100dvh] flex flex-col items-center justify-center relative overflow-y-auto bg-[#07111d] px-4 py-10">
      <OceanBackground />
      <div className="absolute inset-0 bg-[rgba(5,12,20,0.55)]" />

      <div className="z-10 flex flex-col items-center w-full">
        <div className="text-center mb-8 md:mb-12">
          <p className="text-[rgba(122,184,200,0.4)] text-[10px] md:text-xs tracking-widest uppercase mb-2 md:mb-3">
            {displayText}
          </p>
          <h1 className="text-[rgba(180,210,218,0.9)] text-4xl md:text-6xl font-light tracking-[0.25em] md:tracking-[0.5em] uppercase whitespace-nowrap">
            DriftLog
          </h1>
          <p className="text-[rgba(122,184,200,0.4)] text-[10px] md:text-xs tracking-widest mt-2 md:mt-3">
            가족을 찾아, 도시에서 도시로
          </p>
        </div>

        <div className="border border-[rgba(122,184,200,0.2)] bg-[rgba(6,14,22,0.85)] p-7 md:p-10 w-full max-w-xs flex flex-col gap-5 backdrop-blur-sm">
          <div className="flex flex-col gap-1">
            <label className="text-[rgba(122,184,200,0.5)] text-xs tracking-widest uppercase">이름</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="bg-[rgba(122,184,200,0.05)] border border-[rgba(122,184,200,0.2)] text-[rgba(180,210,218,0.8)] px-3 py-2 text-sm md:text-xs outline-none" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[rgba(122,184,200,0.5)] text-xs tracking-widest uppercase">이메일</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-[rgba(122,184,200,0.05)] border border-[rgba(122,184,200,0.2)] text-[rgba(180,210,218,0.8)] px-3 py-2 text-sm md:text-xs outline-none" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[rgba(122,184,200,0.5)] text-xs tracking-widest uppercase">비밀번호</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-[rgba(122,184,200,0.05)] border border-[rgba(122,184,200,0.2)] text-[rgba(180,210,218,0.8)] px-3 py-2 text-sm md:text-xs outline-none" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[rgba(122,184,200,0.5)] text-xs tracking-widest uppercase">비밀번호 확인</label>
            <input type="password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} className="bg-[rgba(122,184,200,0.05)] border border-[rgba(122,184,200,0.2)] text-[rgba(180,210,218,0.8)] px-3 py-2 text-sm md:text-xs outline-none" />
          </div>
          <button onClick={handleSignup} className="border border-[rgba(122,184,200,0.4)] text-[rgba(180,210,218,0.8)] py-2.5 md:py-2 text-xs tracking-widest uppercase hover:bg-[rgba(122,184,200,0.1)] transition-all">
            등록하기
          </button>
          <p className="text-center text-[rgba(122,184,200,0.3)] text-xs">
            이미 항해자이신가요?{" "}
            <a href="/login" className="text-[rgba(122,184,200,0.6)] underline">로그인</a>
          </p>
        </div>

        <p className="mt-6 md:mt-8 text-[rgba(122,184,200,0.2)] text-[10px] md:text-xs tracking-widest uppercase text-center">
          오늘의 바다 · {weatherLabel}
        </p>
      </div>
    </div>
  )
}