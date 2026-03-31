import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

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

    useEffect(() => {
        // App Simulation: Neutralize browser back button
        const handlePopState = () => {
            // Every time the user hits "back", we push the current page again
            // effectively jamming the back button to stay on the current app view
            window.history.pushState(null, '', window.location.pathname);
        };

        // Trap the initial load
        window.history.pushState(null, '', window.location.pathname);
        
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [location.pathname]); // Update trap whenever we move page via buttons

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
