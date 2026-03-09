import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import LogSession from './pages/LogSession.jsx';
import AddExercise from './pages/AddExercise.jsx';
import History from './pages/History.jsx';

function App() {
    return (
        <Router>
            <div className="min-h-screen flex flex-col bg-black text-white selection:bg-red-500/30 font-sans">
                {/* Main Content */}
                <main className="flex-1 w-full max-w-lg mx-auto px-6 pb-32 pt-10">
                    <Routes>
                        <Route path="/" element={<LogSession />} />
                        <Route path="/log-session" element={<LogSession />} />
                        <Route path="/add-exercise" element={<AddExercise />} />
                        <Route path="/history" element={<History />} />
                    </Routes>
                </main>

                {/* Minimalist Tab Bar */}
                <nav className="fixed bottom-0 left-0 right-0 bg-black/80 backdrop-blur-xl border-t border-zinc-900 px-6 py-4 flex justify-between items-center z-50 safe-bottom">
                    <NavLink
                        to="/log-session"
                        className={({ isActive }) => `flex flex-col items-center gap-1 transition-all ${isActive ? 'text-red-500 scale-110' : 'text-zinc-600'}`}
                    >
                        <span className="text-xl">🏋️</span>
                        <span className="text-[10px] font-medium tracking-wide">Workout</span>
                    </NavLink>
                    <NavLink
                        to="/add-exercise"
                        className={({ isActive }) => `flex flex-col items-center gap-1 transition-all ${isActive ? 'text-red-500 scale-110' : 'text-zinc-600'}`}
                    >
                        <span className="text-xl">📝</span>
                        <span className="text-[10px] font-medium tracking-wide">Manage</span>
                    </NavLink>
                    <NavLink
                        to="/history"
                        className={({ isActive }) => `flex flex-col items-center gap-1 transition-all ${isActive ? 'text-red-500 scale-110' : 'text-zinc-600'}`}
                    >
                        <span className="text-xl">📜</span>
                        <span className="text-[10px] font-medium tracking-wide">Logs</span>
                    </NavLink>
                </nav>
            </div>
        </Router>
    );
}

export default App;
