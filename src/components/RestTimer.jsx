import React, { useState, useEffect } from 'react';
import { Timer, Plus, SkipForward, ChevronDown } from 'lucide-react';
import { useWorkout } from '../context/WorkoutContext';

export default function RestTimer() {
    const { restTimer, startRestTimer, stopRestTimer, addRestTime, isRestTimerExpanded, setIsRestTimerExpanded } = useWorkout();

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' + s : s}`;
    };

    const presets = [
        { label: '30s', value: 30 },
        { label: '1m', value: 60 },
        { label: '90s', value: 90 },
        { label: '2m', value: 120 },
    ];

    const [customValue, setCustomValue] = useState('180');
    const [isCustom, setIsCustom] = useState(false);

    if (!isRestTimerExpanded) {
        return (
            <button
                onClick={() => setIsRestTimerExpanded(true)}
                className={`fixed bottom-28 right-6 h-14 bg-[#171717] border border-[#262626] rounded-full flex items-center justify-center text-[#A3A3A3] shadow-2xl z-50 transition-all duration-300 ${restTimer.isActive ? 'px-4 gap-2 w-auto border-brand-500/50' : 'w-14'}`}
            >
                {restTimer.isActive ? (
                    <>
                        <Timer className="w-5 h-5 text-brand-500 animate-pulse" />
                        <span className="text-sm font-black text-white tabular-nums">{formatTime(restTimer.secondsRemaining)}</span>
                    </>
                ) : (
                    <Timer className="w-6 h-6" />
                )}
            </button>
        );
    }

    return (
        <div className={`fixed bottom-28 left-6 right-6 z-50 max-w-lg mx-auto transition-all duration-300 transform ${isRestTimerExpanded ? 'scale-100 opacity-100' : 'scale-95 opacity-100'}`}>
            <div className="card-glass border-[#262626] shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-4 flex flex-col gap-4 overflow-hidden">

                {/* Header */}
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${restTimer.isActive ? 'bg-brand-500/20 text-brand-500 animate-pulse' : 'bg-[#171717] text-[#A3A3A3]'}`}>
                            <Timer className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-black uppercase tracking-widest text-[#A3A3A3]">
                            {restTimer.isActive ? 'Resting' : 'Set Rest Time'}
                        </h3>
                    </div>
                    <button
                        onClick={() => setIsRestTimerExpanded(false)}
                        className="p-1 text-[#A3A3A3] hover:text-white"
                    >
                        <ChevronDown className="w-6 h-6" />
                    </button>
                </div>

                {/* Main Countdown Area */}
                <div className="flex flex-col items-center py-2">
                    <span className={`text-6xl font-black tabular-nums transition-colors ${restTimer.isActive && restTimer.secondsRemaining < 10 ? 'text-red-500' : 'text-white'}`}>
                        {formatTime(restTimer.secondsRemaining)}
                    </span>
                    {restTimer.isActive && (
                        <div className="w-full bg-[#171717] h-1.5 rounded-full mt-4 overflow-hidden">
                            <div
                                className="bg-brand-500 h-full transition-all duration-1000 ease-linear"
                                style={{ width: `${(restTimer.secondsRemaining / restTimer.duration) * 100}%` }}
                            />
                        </div>
                    )}
                </div>

                {/* Controls */}
                <div className="flex flex-col gap-3">
                    {!restTimer.isActive ? (
                        <div className="flex flex-col gap-2">
                            {presets.map(p => (
                                <button
                                    key={p.value}
                                    onClick={() => {
                                        startRestTimer(p.value);
                                        setIsRestTimerExpanded(true);
                                    }}
                                    className="py-4 bg-[#171717] rounded-2xl text-sm font-black text-white border border-[#262626] hover:bg-brand-500 hover:text-black hover:border-brand-500 transition-all flex items-center justify-center gap-3 group"
                                >
                                    <Timer className="w-4 h-4 text-brand-500 group-hover:text-black" />
                                    {p.label} Rest
                                </button>
                            ))}
                            
                            {!isCustom ? (
                                <button
                                    onClick={() => setIsCustom(true)}
                                    className="py-4 bg-[#171717] rounded-2xl text-sm font-black text-[#A3A3A3] border border-[#262626] border-dashed hover:border-brand-500 hover:text-brand-500 transition-all flex items-center justify-center gap-3"
                                >
                                    <Plus className="w-4 h-4" />
                                    Custom Rest
                                </button>
                            ) : (
                                <div className="flex items-center gap-2 animate-fade-in">
                                    <div className="flex-1 bg-[#171717] rounded-2xl border border-brand-500/50 flex items-center px-4 py-3">
                                        <input 
                                            type="number" 
                                            inputMode="numeric"
                                            value={customValue}
                                            onChange={(e) => setCustomValue(e.target.value.replace(/\D/g, ''))}
                                            className="bg-transparent text-white font-black text-base w-full focus:outline-none"
                                            placeholder="Seconds"
                                            autoFocus
                                        />
                                        <span className="text-brand-500 font-bold text-xs uppercase ml-2">sec</span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            const val = parseInt(customValue);
                                            if (!isNaN(val) && val > 0) startRestTimer(val);
                                            setIsCustom(false);
                                        }}
                                        className="bg-brand-500 text-black p-4 rounded-2xl font-black text-sm uppercase transition-all active:scale-95"
                                    >
                                        Go
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            <button
                                onClick={() => addRestTime(30)}
                                className="w-full py-4 bg-brand-500 text-black rounded-2xl text-sm font-black border border-brand-500 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(212,255,0,0.2)] active:scale-95 transition-all"
                            >
                                <Plus className="w-5 h-5 fill-black" /> Add 30s
                            </button>
                            <button
                                onClick={stopRestTimer}
                                className="w-full py-4 bg-[#171717] rounded-2xl text-sm font-black text-red-500 border border-red-500/20 flex items-center justify-center gap-2 hover:bg-red-500/10 active:scale-95 transition-all"
                            >
                                <SkipForward className="w-5 h-5" /> Skip Rest
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
