import React, { useState } from 'react';
import { Timer, Activity, Repeat, Zap } from 'lucide-react';
import ConditioningTimer from '../components/ConditioningTimer';
import { useTimer } from '../context/TimerContext';

export default function ConditioningScreen() {
    const { phase, activeTimerMode, setActiveTimerMode } = useTimer();

    const timerModes = [
        { id: 'circuit', title: 'Circuit', description: 'Custom work/rest intervals with multiple cycles', icon: Timer },
        { id: 'emom', title: 'EMOM', description: 'Every Minute on the Minute (Coming Soon)', icon: Repeat },
        { id: 'amrap', title: 'AMRAP', description: 'As Many Rounds As Possible (Coming Soon)', icon: Activity },
        { id: 'tabata', title: 'Tabata', description: '20s work / 10s rest (Coming Soon)', icon: Zap },
    ];

    // Automatically resume view if timer is already running AND we haven't just closed it
    React.useEffect(() => {
        if (phase !== 'Idle' && phase !== 'Done' && !activeTimerMode) {
            // Only auto-resume if we are ON the page and the user didn't explicitly close it
            // (Actually, if activeTimerMode is null, we are on the selection menu)
            // If we want it to be manual, we can leave it null and let the banner handle it
        }
    }, [phase, activeTimerMode]);

    const handleSelectMode = (modeId) => {
        if (modeId === 'circuit') {
            setActiveTimerMode('circuit');
        } else {
            alert("This timer mode will be implemented soon!");
        }
    };

    return (
        <div className="flex flex-col gap-6 animate-fade-in pt-6 min-h-screen pb-32">
            {!activeTimerMode ? (
                <>
                    <div className="flex flex-col">
                        <h1 className="text-3xl font-black tracking-tight text-white">Timers</h1>
                        <p className="text-[#A3A3A3] text-sm pl-0.5 capitalize">Functional circuits</p>
                    </div>

                    <div className="flex flex-col gap-4">
                        {timerModes.map(mode => (
                            <button
                                key={mode.id}
                                onClick={() => handleSelectMode(mode.id)}
                                className={`w-full card-glass p-6 text-left flex justify-between items-center group relative overflow-hidden transition-all duration-300 ${mode.id === 'circuit' ? 'hover:border-brand-500 hover:shadow-[0_0_20px_rgba(212,255,0,0.1)] active:scale-95' : 'opacity-50'}`}
                            >
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className="w-12 h-12 rounded-full bg-[#171717] flex items-center justify-center text-brand-500 border border-[#262626]">
                                        <mode.icon className="w-6 h-6" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xl font-black tracking-tight text-white">{mode.title}</span>
                                        <span className="text-[#A3A3A3] text-xs font-bold">{mode.description}</span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </>
            ) : (
                <>
                    {activeTimerMode === 'circuit' && (
                        <ConditioningTimer
                            onClose={() => setActiveTimerMode(null)}
                        />
                    )}
                </>
            )}
        </div>
    );
}
