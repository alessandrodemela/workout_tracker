import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { Dumbbell, Plus, LogOut, Play, ClipboardList } from 'lucide-react';
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

    const [showSessionPicker, setShowSessionPicker] = useState(false);

    const logOptions = [
        { id: 'Standard', label: 'Standard', desc: 'Weightlifting & Strength' },
        { id: 'Functional', label: 'Functional', desc: 'Mixed conditioning' },
        { id: 'EMOM', label: 'EMOM', desc: 'Every minute on the minute' },
        { id: 'AMRAP', label: 'AMRAP', desc: 'As many rounds as possible' },
        { id: 'Circuit', label: 'Circuit', desc: 'Circuit training' },
    ];

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
                navigate('/workout', { state: { isLog: false } });
            });
            return;
        }
        sessionStorage.setItem('templateExercises', JSON.stringify(templateExercises));
        navigate('/workout', { state: { isLog: false } });
    };

    const handleSelectSession = (type, isLog = false) => {
        setShowSessionPicker(false);
        if (isTimerActive) {
            setPendingAction(() => () => {
                stopTimer();
                sessionStorage.removeItem('templateExercises');
                navigate('/workout', { state: { sessionType: type, isLog } });
            });
            return;
        }
        sessionStorage.removeItem('templateExercises');
        navigate('/workout', { state: { sessionType: type, isLog } });
    };

    return (
        <div className="flex flex-col gap-8 pb-4 animate-fade-in pt-6">
            <div className="flex justify-between items-start">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black text-[#A3A3A3] uppercase tracking-[0.2em] mb-1">Strive</span>
                    <h1 className="text-4xl font-black tracking-tight text-white">
                        Hey, <span className="text-brand-500">{user?.user_metadata?.nickname || user?.email?.split('@')[0] || 'Atleta'}</span>
                    </h1>
                </div>
            </div>

            <div className="flex gap-4">
                <button
                    onClick={() => handleSelectSession('Standard', false)}
                    className="flex-1 bg-brand-500 hover:bg-brand-400 text-black rounded-3xl p-5 shadow-lg shadow-brand-900/20 active:scale-[0.98] transition-all flex flex-col items-start gap-4 relative overflow-hidden group"
                >
                    <div className="absolute -top-4 -right-4 opacity-10 group-hover:scale-110 transition-transform">
                        <Play className="w-24 h-24 fill-black" />
                    </div>
                    <div className="w-10 h-10 rounded-full bg-black/10 text-black flex items-center justify-center relative z-10 backdrop-blur-sm">
                        <Play className="w-5 h-5 fill-black translate-x-0.5" />
                    </div>
                    <div className="flex flex-col items-start gap-0.5 relative z-10">
                        <span className="text-xl font-black tracking-tight leading-tight">Start Workout</span>
                        {/* <span className="text-[10px] font-bold text-black/60 uppercase tracking-widest">Log Weightlifting</span> */}
                    </div>
                </button>

                <button
                    onClick={() => setShowSessionPicker(true)}
                    className="flex-1 bg-[#171717] border border-[#262626] hover:bg-[#262626] text-white rounded-3xl p-5 active:scale-[0.98] transition-all flex flex-col items-start gap-4 relative overflow-hidden group"
                >
                    <div className="absolute -top-4 -right-4 opacity-[0.03] group-hover:scale-110 transition-transform">
                        <ClipboardList className="w-24 h-24" />
                    </div>
                    <div className="w-10 h-10 rounded-full bg-white/5 text-[#A3A3A3] flex items-center justify-center relative z-10">
                        <ClipboardList className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col items-start gap-0.5 relative z-10">
                        <span className="text-xl font-black tracking-tight leading-tight text-white/90">Log Past</span>
                    </div>
                </button>
            </div>

            {/* Session Type Picker Modal */}
            {showSessionPicker && (
                <div className="fixed inset-0 z-[60] flex items-end justify-center px-4 pb-10 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowSessionPicker(false)}>
                    <div
                        className="w-full max-w-lg bg-[#0A0A0A] border border-[#171717] rounded-[2.5rem] p-6 flex flex-col gap-6 animate-slide-up shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center">
                            <div className="flex flex-col">
                                <h2 className="text-2xl font-black text-white">Log Past Session</h2>
                                <p className="text-[#A3A3A3] text-xs font-bold">Pick the type of session to record</p>
                            </div>
                            <button onClick={() => setShowSessionPicker(false)} className="w-10 h-10 rounded-full bg-[#171717] flex items-center justify-center text-[#A3A3A3]">
                                <Plus className="w-6 h-6 rotate-45" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-2 max-h-[50vh] overflow-y-auto pr-1">
                            {logOptions.map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => handleSelectSession(opt.id, true)}
                                    className="flex items-center justify-between p-4 rounded-2xl bg-[#171717]/50 border border-[#262626] hover:border-white/20 hover:bg-white/5 transition-all text-left"
                                >
                                    <div className="flex flex-col">
                                        <span className="text-base font-black text-white">{opt.label}</span>
                                        <span className="text-[10px] font-bold text-[#A3A3A3] uppercase tracking-widest">{opt.desc}</span>
                                    </div>
                                    <div className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center">
                                        <Plus className="w-4 h-4" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

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
