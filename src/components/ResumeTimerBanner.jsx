import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Timer, Play, Pause, SkipForward, Square } from 'lucide-react';
import { useTimer } from '../context/TimerContext';

export default function ResumeTimerBanner() {
    const navigate = useNavigate();
    const { 
        phase, timeLeft, setActiveTimerMode, 
        isActive, pauseTimer, resumeTimer, stopTimer, skipPhase 
    } = useTimer();

    if (phase === 'Idle' || phase === 'Done') return null;

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' + s : s}`;
    };

    const phaseColors = {
        Prepare: 'text-[#D4FF00] border-[#D4FF00]/30 shadow-[#D4FF00]/10',
        Work: 'text-red-500 border-red-500/30 shadow-red-500/10',
        Rest: 'text-blue-400 border-blue-400/30 shadow-blue-400/10',
        CycleRest: 'text-blue-600 border-blue-600/30 shadow-blue-600/10'
    };

    const currentStyle = phaseColors[phase] || 'text-brand-500 border-brand-500/30 shadow-brand-500/10';

    const handleBannerClick = () => {
        setActiveTimerMode('circuit');
        navigate('/conditioning');
    };

    return (
        <div
            className={`w-full max-w-lg mx-auto bg-[#171717]/90 backdrop-blur-md border shadow-lg rounded-2xl p-4 flex items-center justify-between group transition-all animate-slide-up pointer-events-auto ${currentStyle}`}
        >
            <div className="flex items-center gap-3 cursor-pointer overflow-hidden flex-1" onClick={handleBannerClick}>
                <div className="w-9 h-9 rounded-full bg-white/5 flex-shrink-0 flex items-center justify-center animate-pulse">
                    <Timer className="w-5 h-5" />
                </div>
                <div className="flex flex-col text-left truncate">
                    <span className="text-xs font-black text-white truncate">{phase} Phase</span>
                    <span className="text-[14px] font-black tabular-nums transition-colors opacity-90">
                        {formatTime(timeLeft)}
                    </span>
                </div>
            </div>

            <div className="flex items-center gap-2 pl-4 border-l border-white/5">
                <button 
                    onClick={(e) => { e.stopPropagation(); stopTimer(); }}
                    className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-95"
                >
                    <Square className="w-4 h-4 fill-current" />
                </button>
                
                <button 
                    onClick={(e) => { e.stopPropagation(); isActive ? pauseTimer() : resumeTimer(); }}
                    className="w-12 h-12 rounded-full bg-brand-500 flex items-center justify-center text-black shadow-[0_0_20px_rgba(212,255,0,0.2)] hover:scale-105 active:scale-95 transition-all"
                >
                    {isActive ? (
                        <Pause className="w-5 h-5 fill-black" />
                    ) : (
                        <Play className="w-5 h-5 fill-black translate-x-0.5" />
                    )}
                </button>
                
                <button 
                    onClick={(e) => { e.stopPropagation(); skipPhase(); }}
                    className="w-10 h-10 rounded-full bg-[#262626] flex items-center justify-center text-[#A3A3A3] hover:text-white transition-all active:scale-95"
                >
                    <SkipForward className="w-4 h-4 fill-current" />
                </button>
            </div>
        </div>
    );
}

