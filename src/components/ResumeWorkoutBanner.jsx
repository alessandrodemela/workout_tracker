import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Timer } from 'lucide-react';
import { useWorkout } from '../context/WorkoutContext';

export default function ResumeWorkoutBanner() {
    const navigate = useNavigate();
    const { secondsElapsed, restTimer } = useWorkout();

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' + s : s}`;
    };

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
        <button
            onClick={() => navigate('/workout')}
            className="w-full max-w-lg mx-auto bg-[#171717]/90 backdrop-blur-md border border-brand-500/30 shadow-lg shadow-brand-500/10 rounded-2xl p-4 flex items-center justify-between group hover:border-brand-500/60 transition-all hover:scale-[1.02] animate-slide-up pointer-events-auto"
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
            <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-500">Duration</span>
                    <span className="text-xl font-black text-white tabular-nums group-hover:text-brand-400 transition-colors">
                        {formatDuration(secondsElapsed)}
                    </span>
                </div>
                {restTimer.isActive && (
                    <>
                        <div className="w-px h-8 bg-[#262626]" />
                        <div className="flex flex-col items-start min-w-[60px]">
                            <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Rest</span>
                            <div className="flex items-center gap-1.5">
                                <Timer className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                                <span className="text-xl font-black text-white tabular-nums">
                                    {formatTime(restTimer.secondsRemaining)}
                                </span>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </button>
    );
}
