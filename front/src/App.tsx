import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'
import VoyagePage from './pages/VoyagePage'
import StudyPage from './pages/StudyPage'
import ModeSelectPage from './pages/ModeSelectPage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import AdminPage from './pages/AdminPage'
import KakaoCallback from "./pages/KakaoCallback";

import { WeatherProvider } from "./contexts/WeatherContext";
import ProtectedRoute from './routes/ProtectedRoute'
import AdminRoute from './routes/AdminRoute'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 로그인 후 진입 — 모드 선택 */}
        <Route path='/' element={
          <ProtectedRoute>
            <ModeSelectPage/>
          </ProtectedRoute>
        }/>

        {/* 항해 모드 */}
        <Route path='/voyage' element={
          <ProtectedRoute>
            <WeatherProvider>
              <VoyagePage/>
            </WeatherProvider>
          </ProtectedRoute>
        }/>


        <Route path='/study' element={
          <ProtectedRoute>
            <WeatherProvider>
              <StudyPage/>
            </WeatherProvider>
          </ProtectedRoute>
        }/>

        <Route path="/login" element={<LoginPage/>}/>
        <Route path="/signup" element={<SignupPage/>}/>
        <Route path="/auth/kakao/callback" element={<KakaoCallback />} />

        <Route path='/admin' element={
          <ProtectedRoute>
            <AdminRoute>
              <AdminPage/>
            </AdminRoute>
          </ProtectedRoute>
        }/>
      </Routes>
    </BrowserRouter>
  )
}

export default App