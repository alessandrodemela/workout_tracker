import React from 'react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { Dumbbell, Plus } from 'lucide-react';
import { API_URL, fetcher } from '../api';
import CalendarWidget from '../components/CalendarWidget';

export default function HomeDashboard() {
    const navigate = useNavigate();

    const { data: templatesData } = useSWR(`${API_URL}/templates`, fetcher);
    const { data: historyData } = useSWR(`${API_URL}/workout-history`, fetcher);

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

    const handleStartTemplate = (templateExercises) => {
        sessionStorage.setItem('templateExercises', JSON.stringify(templateExercises));
        navigate('/workout');
    };

    const handleStartCustom = () => {
        sessionStorage.removeItem('templateExercises');
        navigate('/workout');
    };

    return (
        <div className="flex flex-col gap-8 pb-32 animate-fade-in pt-6">
            <div className="flex justify-between items-end">
                <div className="flex flex-col">
                    <span className="text-xs font-bold text-[#A3A3A3] uppercase tracking-widest pl-1 mb-1">Welcome back</span>
                    <h1 className="text-4xl font-black tracking-tight text-white">Ale</h1>
                </div>
                <div className="w-12 h-12 rounded-full bg-[#171717] flex items-center justify-center text-xl border border-[#262626]">
                    💪
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
        </div>
    );
}
