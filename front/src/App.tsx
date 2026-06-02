import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './App.css'
import VoyagePage from './pages/VoyagePage'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import AdminPage from './pages/AdminPage'

import { WeatherProvider, useWeather } from "./contexts/WeatherContext";
import ProtectedRoute from './routes/ProtectedRoute'
import AdminRoute from './routes/AdminRoute'
import ScenePreview from './pages/ScenePreview'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={
          <ProtectedRoute>
            <WeatherProvider>
              <VoyagePage/>
            </WeatherProvider>
          </ProtectedRoute>
        }/>
        <Route path="/scene-preview" element={<ScenePreview />} />
        <Route path="/login" element={<LoginPage/>}/>
        <Route path="/signup" element={<SignupPage/>}/>
        
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