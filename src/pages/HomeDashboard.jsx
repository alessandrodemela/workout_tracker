import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { Dumbbell, Plus, LogOut } from 'lucide-react';
import { API_URL, fetcher } from '../api';
import { useAuth } from '../context/AuthContext';
import CalendarWidget from '../components/CalendarWidget';
import { useTimer } from '../context/TimerContext';
import { useWorkout } from '../context/WorkoutContext';
import ConfirmModal from '../components/ConfirmModal';

export default function HomeDashboard() {
    const navigate = useNavigate();
    const { phase, stopTimer, activeTimerMode } = useTimer();
    const { isActive: isWorkoutActive } = useWorkout();
    const { user, signOut } = useAuth();

    const [pendingAction, setPendingAction] = useState(null);

    const { data: templatesData, error: templatesError } = useSWR(`${API_URL}/templates`, fetcher);
    const { data: historyData, error: historyError } = useSWR(`${API_URL}/workout-history`, fetcher);

    if (templatesError || historyError) return (
        <div className="p-12 text-[#A3A3A3] text-center font-bold flex flex-col gap-2">
            <span>Error loading dashboard</span>
            <span className="text-[10px] font-mono opacity-50 uppercase">
                {templatesError?.message || historyError?.message || 'Check your internet or Supabase project status'}
            </span>
        </div>
    );

    const templates = templatesData?.templates || [];
    const workoutDates = [
        ...(historyData?.workouts || []).map(w => w.Date),
        ...(historyData?.functional || []).map(f => f.Date)
    ];

    const groupedTemplates = templates.reduce((acc, curr) => {
        const key = `${curr.Mesocycle} - Split ${curr.Split}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(curr);
        return acc;
    }, {});

    const templateKeys = Object.keys(groupedTemplates).sort();

    const isTimerActive = phase !== 'Idle' && phase !== 'Done';

    const handleStartTemplate = (templateExercises) => {
        if (isTimerActive) {
            setPendingAction(() => () => {
                stopTimer();
                sessionStorage.setItem('templateExercises', JSON.stringify(templateExercises));
                navigate('/workout');
            });
            return;
        }
        sessionStorage.setItem('templateExercises', JSON.stringify(templateExercises));
        navigate('/workout');
    };

    const handleStartCustom = () => {
        if (isTimerActive) {
            setPendingAction(() => () => {
                stopTimer();
                sessionStorage.removeItem('templateExercises');
                navigate('/workout');
            });
            return;
        }
        sessionStorage.removeItem('templateExercises');
        navigate('/workout');
    };

    return (
        <div className="flex flex-col gap-8 pb-4 animate-fade-in">
            <div className="flex justify-between items-start">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black text-[#A3A3A3] uppercase tracking-[0.2em] mb-1">Strive</span>
                    <h1 className="text-4xl font-black tracking-tight text-white">
                        Hey, <span className="text-brand-500">{user?.user_metadata?.nickname || user?.email?.split('@')[0] || 'Atleta'}</span>
                    </h1>
                </div>
            </div>

            <div className="flex flex-col gap-4">
                <button
                    onClick={handleStartCustom}
                    className="w-full bg-brand-500 hover:bg-brand-400 text-black rounded-3xl p-6 shadow-lg shadow-brand-900/20 active:scale-[0.98] transition-all flex justify-between items-center group relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 -mr-8 -mt-8 opacity-10 group-hover:scale-110 transition-transform">
                        <Dumbbell className="w-32 h-32" />
                    </div>
                    <div className="flex flex-col items-start gap-1 relative z-10">
                        <span className="text-2xl font-black tracking-tight">Start Workout</span>
                        <span className="text-black/60 font-medium text-sm">Create an empty session</span>
                    </div>
                    <div className="w-10 h-10 rounded-full bg-black/10 text-black flex items-center justify-center relative z-10 backdrop-blur-sm">
                        <Plus className="w-5 h-5" strokeWidth={3} />
                    </div>
                </button>
            </div>

            <div className="flex flex-col gap-4">
                <div className="flex justify-between items-end mb-2">
                    <h2 className="text-lg font-bold">Routines</h2>
                </div>

                <div className="flex overflow-x-auto gap-4 pb-4 -mx-6 px-6 snap-x snap-mandatory" style={{ scrollbarWidth: 'none' }}>
                    {templateKeys.length > 0 ? templateKeys.map(key => (
                        <button
                            key={key}
                            onClick={() => handleStartTemplate(groupedTemplates[key])}
                            className="snap-center flex-shrink-0 w-64 card-glass text-left flex flex-col gap-4 active:scale-95 transition-all"
                        >
                            <div className="w-10 h-10 rounded-full bg-[#171717] flex items-center justify-center text-brand-500 border border-[#262626]">
                                <Dumbbell className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col mt-2">
                                <h3 className="text-xl font-bold text-white mb-1 truncate">{key}</h3>
                                <p className="text-xs font-bold text-[#A3A3A3] uppercase tracking-widest">{groupedTemplates[key].length} Movements</p>
                            </div>
                        </button>
                    )) : (
                        <div className="w-full text-center py-8 text-[#A3A3A3] text-sm card-glass">No templates found</div>
                    )}
                </div>
            </div>

            <div className="flex flex-col gap-4">
                <h2 className="text-lg font-bold">Activity</h2>
                <CalendarWidget activeDays={workoutDates} />
            </div>

            <ConfirmModal
                isOpen={!!pendingAction}
                onClose={() => setPendingAction(null)}
                onConfirm={() => {
                    if (pendingAction) pendingAction();
                    setPendingAction(null);
                }}
                title={`Stop Active ${activeTimerMode === 'emom' ? 'EMOM' : activeTimerMode === 'amrap' ? 'AMRAP' : 'Circuit'}?`}
                message={`You have an active ${activeTimerMode === 'emom' ? 'EMOM' : activeTimerMode === 'amrap' ? 'AMRAP' : 'circuit'}. Starting a workout will end your current session. Continue?`}
                confirmText={`Stop & Start Workout`}
                cancelText="Back to Timer"
                type="danger"
            />
        </div>
    );
}
