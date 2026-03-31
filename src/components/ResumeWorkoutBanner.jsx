import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play } from 'lucide-react';
import { useWorkout } from '../context/WorkoutContext';

export default function ResumeWorkoutBanner() {
    const navigate = useNavigate();
    const { secondsElapsed } = useWorkout();

    const formatDuration = (sec) => {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = sec % 60;
        return [h, m, s]
            .map(v => v < 10 ? "0" + v : v)
            .filter((v, i) => v !== "00" || i > 0)
            .join(":");
    };

    return (
        <div className="fixed bottom-[88px] left-4 right-4 z-40 max-w-lg mx-auto animate-slide-up">
            <button
                onClick={() => navigate('/workout')}
                className="w-full bg-[#171717]/90 backdrop-blur-md border border-brand-500/30 shadow-lg shadow-brand-500/10 rounded-2xl p-4 flex items-center justify-between group hover:border-brand-500/60 transition-all hover:scale-[1.02]"
            >
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-brand-500/20 text-brand-500 flex items-center justify-center animate-pulse">
                        <Play className="w-5 h-5 ml-1" />
                    </div>
                    <div className="flex flex-col text-left">
                        <span className="text-sm font-black text-white">Active Session</span>
                        <span className="text-xs font-bold text-[#A3A3A3]">Tap to return</span>
                    </div>
                </div>
                <div className="text-xl font-black text-brand-500 tabular-nums pr-2 group-hover:text-brand-400 transition-colors">
                    {formatDuration(secondsElapsed)}
                </div>
            </button>
        </div>
    );
}
