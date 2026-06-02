import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "../api/auth";
import OceanBackground from "../components/OceanBackground";
import { getTodayWeather } from "../api/weather";
import { WEATHER_MAP } from "../constants/weather";

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [weatherLabel, setWeatherLabel] = useState('잔잔한 수면')

  const handleLogin = async () => {
    try {
      const result = await login({ email, password });
      localStorage.setItem("accessToken", result.accessToken);
      localStorage.setItem("refreshToken", result.refreshToken);
      localStorage.setItem("justLoggedIn", "1"); 
      navigate("/");
    } catch (e) {
      console.error("로그인 실패:", e);
      alert("이메일 또는 비밀번호를 확인해주세요.");
    }
  }

  const [displayText, setDisplayText] = useState('')
  const fullText = '물에 잠긴 한국을 항해하다'

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
    <div className="w-full h-screen flex flex-col items-center justify-center relative overflow-hidden bg-[#07111d]">
      <OceanBackground />
      <div className="absolute inset-0 bg-[rgba(5,12,20,0.55)]" />

      <div className="z-10 flex flex-col items-center">
        <div className="text-center mb-12">
          <p className="text-[rgba(122,184,200,0.4)] text-xs tracking-widest uppercase mb-3">
            {displayText}
          </p>
          <h1 className="text-[rgba(180,210,218,0.9)] text-6xl font-light tracking-[0.5em] uppercase">
            DriftLog
          </h1>
          <p className="text-[rgba(122,184,200,0.4)] text-xs tracking-widest mt-3">
            가족을 찾아, 도시에서 도시로
          </p>
        </div>

        <div className="border border-[rgba(122,184,200,0.2)] bg-[rgba(6,14,22,0.85)] p-10 w-80 flex flex-col gap-5 backdrop-blur-sm">
          <div className="flex flex-col gap-1">
            <label className="text-[rgba(122,184,200,0.5)] text-xs tracking-widest uppercase">이메일</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-[rgba(122,184,200,0.05)] border border-[rgba(122,184,200,0.2)] text-[rgba(180,210,218,0.8)] px-3 py-2 text-xs outline-none" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[rgba(122,184,200,0.5)] text-xs tracking-widest uppercase">비밀번호</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-[rgba(122,184,200,0.05)] border border-[rgba(122,184,200,0.2)] text-[rgba(180,210,218,0.8)] px-3 py-2 text-xs outline-none" />
          </div>
          <button onClick={handleLogin} className="border border-[rgba(122,184,200,0.4)] text-[rgba(180,210,218,0.8)] py-2 text-xs tracking-widest uppercase hover:bg-[rgba(122,184,200,0.1)] transition-all">
            출항
          </button>
          <p className="text-center text-[rgba(122,184,200,0.3)] text-xs">
            처음이신가요?{" "}
            <a href="/signup" className="text-[rgba(122,184,200,0.6)] underline">등록하기</a>
          </p>
        </div>

        <p className="mt-8 text-[rgba(122,184,200,0.2)] text-xs tracking-widest uppercase">
          오늘의 바다 · {weatherLabel}
        </p>
      </div>
    </div>
  )
}