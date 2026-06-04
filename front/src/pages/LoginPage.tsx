import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { login, socialLogin } from "../api/auth";
import OceanBackground from "../components/OceanBackground";
import { getTodayWeather } from "../api/weather";
import { WEATHER_MAP } from "../constants/weather";

// 구글 전역 객체 타입
declare global {
  interface Window {
    google?: any;
  }
}

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [weatherLabel, setWeatherLabel] = useState('잔잔한 수면')
  const googleBtnRef = useRef<HTMLDivElement>(null);

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

  // 구글 로그인 콜백 — idToken 받아서 백엔드로
  const handleGoogleLogin = async (response: any) => {
    try {
      const idToken = response.credential;  // 구글이 준 idToken
      const result = await socialLogin(idToken);
      localStorage.setItem("accessToken", result.accessToken);
      localStorage.setItem("refreshToken", result.refreshToken);
      localStorage.setItem("justLoggedIn", "1");
      navigate("/");
    } catch (e) {
      console.error("구글 로그인 실패:", e);
      alert("구글 로그인에 실패했습니다.");
    }
  };

  // 컨테이너 폭에 맞춰 구글 버튼 렌더 (width는 200~400px 숫자만 허용)
  useEffect(() => {
    let cancelled = false;
    let observer: ResizeObserver | null = null;
    let initialized = false;

    const drawButton = () => {
      const el = googleBtnRef.current;
      if (!el) return;

      // 컨테이너 실제 폭 측정 → 200~400 사이로 클램프
      const containerWidth = el.clientWidth || 256;
      const width = Math.min(Math.max(Math.round(containerWidth), 200), 400);

      // 재렌더 시 기존 버튼 제거 (renderButton 중복 누적 방지)
      el.innerHTML = "";
      window.google.accounts.id.renderButton(el, {
        theme: "outline",
        size: "large",
        width,
        text: "signin_with",
        shape: "rectangular",
        logo_alignment: "center",
      });
    };

    const tryInit = () => {
      if (!window.google || !googleBtnRef.current) return false;

      if (!initialized) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: handleGoogleLogin,
        });
        initialized = true;
      }

      drawButton();

      // 폭 변할 때마다 다시 그림 (반응형 대응)
      observer = new ResizeObserver(() => {
        if (!cancelled) drawButton();
      });
      observer.observe(googleBtnRef.current);
      return true;
    };

    // 1차 시도 — 이미 로드돼 있으면 즉시
    if (tryInit()) {
      return () => {
        cancelled = true;
        observer?.disconnect();
      };
    }

    // 아직이면 100ms 간격 재시도, 최대 10초
    let attempts = 0;
    const timer = setInterval(() => {
      attempts++;
      if (cancelled || tryInit() || attempts >= 100) {
        clearInterval(timer);
      }
    }, 100);

    return () => {
      cancelled = true;
      clearInterval(timer);
      observer?.disconnect();
    };
  }, []);

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
    <div className="w-full h-screen flex flex-col items-center justify-center relative overflow-hidden bg-[#07111d] px-4">
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
            <label className="text-[rgba(122,184,200,0.5)] text-xs tracking-widest uppercase">이메일</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-[rgba(122,184,200,0.05)] border border-[rgba(122,184,200,0.2)] text-[rgba(180,210,218,0.8)] px-3 py-2 text-sm md:text-xs outline-none" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[rgba(122,184,200,0.5)] text-xs tracking-widest uppercase">비밀번호</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-[rgba(122,184,200,0.05)] border border-[rgba(122,184,200,0.2)] text-[rgba(180,210,218,0.8)] px-3 py-2 text-sm md:text-xs outline-none" />
          </div>
          <button onClick={handleLogin} className="border border-[rgba(122,184,200,0.4)] text-[rgba(180,210,218,0.8)] py-2.5 md:py-2 text-xs tracking-widest uppercase hover:bg-[rgba(122,184,200,0.1)] transition-all">
            출항
          </button>

          {/* 구분선 */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-[rgba(122,184,200,0.15)]" />
            <span className="text-[rgba(122,184,200,0.3)] text-[10px] tracking-widest uppercase">또는</span>
            <div className="flex-1 h-px bg-[rgba(122,184,200,0.15)]" />
          </div>

          {/* 구글 로그인 버튼 (GIS가 컨테이너 폭에 맞춰 렌더) */}
          <div ref={googleBtnRef} className="w-full overflow-hidden" />

          <p className="text-center text-[rgba(122,184,200,0.3)] text-xs">
            처음이신가요?{" "}
            <a href="/signup" className="text-[rgba(122,184,200,0.6)] underline">등록하기</a>
          </p>
        </div>

        <p className="mt-6 md:mt-8 text-[rgba(122,184,200,0.2)] text-[10px] md:text-xs tracking-widest uppercase text-center">
          오늘의 바다 · {weatherLabel}
        </p>
      </div>
    </div>
  )
}