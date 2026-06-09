import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { kakaoLogin } from "../api/auth";

export default function KakaoCallback() {
  const navigate = useNavigate();
  const called = useRef(false);   // StrictMode 이중 실행 방지 (code는 1회용)

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const code = new URLSearchParams(window.location.search).get("code");

    if (!code) {
      alert("카카오 로그인에 실패했습니다.");
      navigate("/login");
      return;
    }

    kakaoLogin(code)
      .then((result) => {
        localStorage.setItem("accessToken", result.accessToken);
        localStorage.setItem("refreshToken", result.refreshToken);
        localStorage.setItem("justLoggedIn", "1");
        navigate("/");
      })
      .catch((e) => {
        console.error("카카오 로그인 실패:", e);
        alert("카카오 로그인에 실패했습니다.");
        navigate("/login");
      });
  }, [navigate]);

  return (
    <div className="w-full h-screen flex items-center justify-center bg-[#07111d]">
      <p className="text-[rgba(180,210,218,0.7)] text-sm tracking-widest uppercase">
        로그인 중...
      </p>
    </div>
  );
}