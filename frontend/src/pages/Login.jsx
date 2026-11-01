import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser, setAuthToken } from '../api/client';
import Swal from 'sweetalert2';
import { Zap, Lock, User, ArrowRight } from 'lucide-react';

export default function Login({ setUser }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) return;

    try {
      setLoading(true);
      const res = await loginUser(username, password);
      setAuthToken(res.data.token);
      setUser(res.data.user);
      
      Swal.fire({
        icon: 'success',
        title: 'Welcome Back!',
        text: `Logged in as ${res.data.user.username}`,
        background: '#0f172a',
        color: '#f8fafc',
        timer: 1500,
        showConfirmButton: false,
      });
      navigate('/');
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: 'Authentication Failed',
        text: err.response?.data?.error || 'Invalid username or password.',
        background: '#0f172a',
        color: '#f8fafc',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center animate-fadeIn px-4">
      <div className="w-full max-w-md glass-card p-8 rounded-3xl border border-slate-800 space-y-6 shadow-2xl">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
            <Zap className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-extrabold text-white">Sign In to ToneSense</h2>
          <p className="text-xs text-slate-400">Access your multi-class sentiment predictions & batch history</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Username</label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase mb-1">Password</label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950/80 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
              />
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {loading ? 'Authenticating...' : 'Sign In'} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-center text-xs text-slate-400">
          Don't have an account?{' '}
          <Link to="/register" className="font-bold text-indigo-400 hover:text-indigo-300">
            Create Account
          </Link>
        </p>
      </div>
    </div>
  );
}
