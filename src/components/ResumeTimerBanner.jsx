import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Timer, Play, Pause, SkipForward, Square, Check, Plus } from 'lucide-react';
import { useTimer } from '../context/TimerContext';
import ConfirmModal from './ConfirmModal';

export default function ResumeTimerBanner() {
    const navigate = useNavigate();
    const { 
        phase, timeLeft, setActiveTimerMode, activeTimerMode,
        isActive, pauseTimer, resumeTimer, stopTimer, skipPhase,
        totalElapsedSeconds
    } = useTimer();

    const modeName = activeTimerMode === 'emom' ? 'EMOM' : activeTimerMode === 'amrap' ? 'AMRAP' : 'Circuit';

    const [showStopModal, setShowStopModal] = useState(false);

    if (phase === 'Idle') return null;

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
        // Ensure the mode is set if we're resuming
        if (!activeTimerMode) {
            // Fallback to circuit if lost
            setActiveTimerMode('circuit');
        }
        navigate('/conditioning');
    };

    // Done state — show log prompt
    if (phase === 'Done') {
        return (
            <div className="w-full max-w-lg mx-auto bg-[#171717]/90 backdrop-blur-md border border-brand-500/30 shadow-lg shadow-brand-500/10 rounded-2xl p-4 flex items-center justify-between animate-slide-up pointer-events-auto">
                <div className="flex items-center gap-3 flex-1">
                    <div className="w-9 h-9 rounded-full bg-brand-500/10 flex-shrink-0 flex items-center justify-center text-brand-500">
                        <Check className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col text-left">
                        <span className="text-xs font-black text-white">{modeName} Complete</span>
                        <span className="text-[11px] text-[#A3A3A3] font-bold">
                            {Math.floor(totalElapsedSeconds / 60)}m {totalElapsedSeconds % 60}s total
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2 pl-3 border-l border-white/5">
                    <button
                        onClick={() => {
                            stopTimer();
                            navigate('/workout', {
                                state: {
                                    isLog: true,
                                    sessionType: 'Functional',
                                    prefillDuration: totalElapsedSeconds
                                }
                            });
                        }}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500 text-black text-xs font-black hover:bg-brand-400 active:scale-95 transition-all"
                    >
                        <Plus className="w-3.5 h-3.5" strokeWidth={3} /> Log Workout
                    </button>
                    <button
                        onClick={() => stopTimer()}
                        className="w-9 h-9 rounded-full bg-[#262626] flex items-center justify-center text-[#A3A3A3] hover:text-white transition-all active:scale-95"
                    >
                        <Square className="w-3.5 h-3.5 fill-current" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            <div
                className={`w-full max-w-lg mx-auto bg-[#171717]/90 backdrop-blur-md border shadow-lg rounded-2xl p-4 flex items-center justify-between group transition-all animate-slide-up pointer-events-auto ${currentStyle}`}
            >
                <div className="flex items-center gap-3 cursor-pointer overflow-hidden flex-1" onClick={handleBannerClick}>
                    <div className="w-9 h-9 rounded-full bg-white/5 flex-shrink-0 flex items-center justify-center animate-pulse">
                        <Timer className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col text-left truncate">
                        <span className="text-xs font-black text-white truncate">{phase === 'CycleRest' ? 'Cycle Rest' : phase} Phase</span>
                        <span className="text-[14px] font-black tabular-nums transition-colors opacity-90">
                            {formatTime(timeLeft)}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2 pl-4 border-l border-white/5">
                    <button 
                        onClick={(e) => { e.stopPropagation(); setShowStopModal(true); }}
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

            <ConfirmModal
                isOpen={showStopModal}
                onClose={() => setShowStopModal(false)}
                onConfirm={() => { stopTimer(); setShowStopModal(false); }}
                title={`Stop ${modeName}?`}
                message={`Are you sure you want to stop the current ${modeName.toLowerCase()}? All progress will be lost.`}
                confirmText={`Stop ${modeName}`}
                cancelText="Keep Going"
                type="danger"
            />
        </>
    );
}

