import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import SingleDetect from './pages/SingleDetect';
import BatchDetect from './pages/BatchDetect';
import YoutubeDetect from './pages/YoutubeDetect';
import ModelInsights from './pages/ModelInsights';
import History from './pages/History';
import Login from './pages/Login';
import Register from './pages/Register';
import { getUserProfile, setAuthToken } from './api/client';

export default function App() {
  const [user, setUser] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('tone_token');
    if (token) {
      getUserProfile()
        .then((res) => {
          setUser(res.data);
        })
        .catch(() => {
          setAuthToken(null);
          setUser(null);
        });
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      <Navbar
        user={user}
        setUser={setUser}
        toggleMobileSidebar={() => setMobileOpen((prev) => !prev)}
      />

      <div className="flex flex-1 relative">
        <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />

        <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard user={user} />} />
            <Route path="/single" element={<SingleDetect user={user} />} />
            <Route path="/batch" element={<BatchDetect user={user} />} />
            <Route path="/youtube" element={<YoutubeDetect user={user} />} />
            <Route path="/insights" element={<ModelInsights />} />
            <Route path="/history" element={<History user={user} />} />
            <Route path="/login" element={<Login setUser={setUser} />} />
            <Route path="/register" element={<Register setUser={setUser} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}
