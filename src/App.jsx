import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

import LandingScreen from './pages/LandingScreen.jsx';
import HomeDashboard from './pages/HomeDashboard.jsx';
import ActiveWorkout from './pages/ActiveWorkout.jsx';
import ExerciseDatabase from './pages/ExerciseDatabase.jsx';
import History from './pages/History.jsx';
import ConditioningScreen from './pages/ConditioningScreen.jsx';
import BottomNav from './components/BottomNav.jsx';
import { WorkoutProvider, useWorkout } from './context/WorkoutContext.jsx';
import ResumeWorkoutBanner from './components/ResumeWorkoutBanner.jsx';
import { TimerProvider, useTimer } from './context/TimerContext.jsx';
import ResumeTimerBanner from './components/ResumeTimerBanner.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import Login from './pages/Login.jsx';
import UserMenu from './components/UserMenu.jsx';
import Profile from './pages/Profile.jsx';
import Settings from './pages/Settings.jsx';

function AppContent() {
    const location = useLocation();
    const { isActive } = useWorkout();
    const { phase, activeTimerMode } = useTimer();
    const { user, loading } = useAuth();

    useEffect(() => {
        const handlePopState = () => {
            window.history.pushState(null, '', window.location.pathname);
        };
        window.history.pushState(null, '', window.location.pathname);
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [location.pathname]);

    const isTimerActive = phase !== 'Idle' && phase !== 'Done';
    const showNav = location.pathname !== '/';

    if (loading) return null; // Or a loading spinner

    if (!user) {
        return <Login />;
    }

    return (
        <div className="h-dvh flex flex-col font-sans bg-[#000000] text-[#FAFAFA] selection:bg-brand-500/30 overflow-hidden relative">
            {/* Global User Menu - Top Right */}
            {showNav && user && location.pathname !== '/workout' && location.pathname !== '/conditioning' && location.pathname !== '/profile' && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg z-50 pointer-events-none">
                    <UserMenu />
                </div>
            )}

            {/* Scrollable page content — sits above the fixed nav */}
            <main className={`flex-1 w-full max-w-lg mx-auto px-6 overflow-y-auto flex flex-col ${showNav ? 'pb-[calc(env(safe-area-inset-bottom,20px)+96px)]' : 'pb-0'}`}>
                <Routes location={location} key={location.pathname}>
                    <Route path="/" element={<LandingScreen />} />
                    <Route path="/home" element={<HomeDashboard />} />
                    <Route path="/workout" element={<ActiveWorkout />} />
                    <Route path="/conditioning" element={
                        <div className="flex-1 flex flex-col">
                            <ConditioningScreen />
                        </div>
                    } />
                    <Route path="/exercises" element={<ExerciseDatabase />} />
                    <Route path="/history" element={<History />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/settings" element={<Settings />} />
                </Routes>
            </main>

            {/* Floating banners above nav */}
            <div className="fixed bottom-[calc(env(safe-area-inset-bottom,20px)+84px)] left-0 right-0 px-4 flex flex-col items-center gap-2 pointer-events-none z-40">
                {isActive && location.pathname !== '/workout' && (location.pathname !== '/conditioning' || !activeTimerMode) && <ResumeWorkoutBanner />}
                {isTimerActive && !activeTimerMode && <ResumeTimerBanner />}
                {isTimerActive && activeTimerMode && location.pathname !== '/conditioning' && <ResumeTimerBanner />}
            </div>

            {/* Bottom nav — always fixed at bottom */}
            {showNav && <BottomNav />}
        </div>
    );
}

function App() {
    return (
        <AuthProvider>
            <TimerProvider>
                <WorkoutProvider>
                    <Router>
                        <AppContent />
                    </Router>
                </WorkoutProvider>
            </TimerProvider>
        </AuthProvider>
    );
}

export default App;
