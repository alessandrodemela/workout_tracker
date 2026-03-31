import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';

import LandingScreen from './pages/LandingScreen.jsx';
import HomeDashboard from './pages/HomeDashboard.jsx';
import ActiveWorkout from './pages/ActiveWorkout.jsx';
import ExerciseDatabase from './pages/ExerciseDatabase.jsx';
import History from './pages/History.jsx';
import BottomNav from './components/BottomNav.jsx';
import { WorkoutProvider, useWorkout } from './context/WorkoutContext.jsx';
import ResumeWorkoutBanner from './components/ResumeWorkoutBanner.jsx';

function AppContent() {
    const location = useLocation();
    const { isActive } = useWorkout();

    return (
        <div className="min-h-screen flex flex-col font-sans bg-[#000000] text-[#FAFAFA] selection:bg-brand-500/30">
            <main className="flex-1 w-full max-w-lg mx-auto px-6 pb-32">
                <Routes location={location} key={location.pathname}>
                    <Route path="/" element={<LandingScreen />} />
                    <Route path="/home" element={<HomeDashboard />} />
                    <Route path="/workout" element={<ActiveWorkout />} />
                    <Route path="/exercises" element={<ExerciseDatabase />} />
                    <Route path="/history" element={<History />} />
                </Routes>
            </main>

            {isActive && location.pathname !== '/workout' && <ResumeWorkoutBanner />}
            {location.pathname !== '/' && <BottomNav />}
        </div>
    );
}

function App() {
    return (
        <WorkoutProvider>
            <Router>
                <AppContent />
            </Router>
        </WorkoutProvider>
    );
}

export default App;
