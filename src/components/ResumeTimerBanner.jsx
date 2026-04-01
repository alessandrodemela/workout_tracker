import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Timer } from 'lucide-react';
import { useTimer } from '../context/TimerContext';

export default function ResumeTimerBanner() {
    const navigate = useNavigate();
    const { phase, timeLeft, setActiveTimerMode } = useTimer();

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
        <button
            onClick={handleBannerClick}
            className={`w-full max-w-lg mx-auto bg-[#171717]/90 backdrop-blur-md border shadow-lg rounded-2xl p-4 flex items-center justify-between group transition-all hover:scale-[1.02] animate-slide-up pointer-events-auto ${currentStyle}`}
        >
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center animate-pulse">
                    <Timer className="w-5 h-5" />
                </div>
                <div className="flex flex-col text-left">
                    <span className="text-sm font-black text-white">{phase} Phase</span>
                    <span className="text-xs font-bold text-[#A3A3A3]">Tap to return</span>
                </div>
            </div>
            <div className="text-xl font-black tabular-nums pr-2 transition-colors opacity-90">
                 {formatTime(timeLeft)}
            </div>
        </button>
    );
}
