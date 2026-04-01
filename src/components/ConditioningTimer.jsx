import React from 'react';
import { Play, Pause, Plus, Minus, Settings2, ChevronLeft, SkipForward, Square } from 'lucide-react';
import { useTimer } from '../context/TimerContext';

export default function ConditioningTimer({ onClose }) {
    const {
        config, updateConfig, isConfiguring, setIsConfiguring,
        phase, timeLeft, currentRound, currentCycle, isActive,
        startTimer, pauseTimer, resumeTimer, stopTimer, skipPhase
    } = useTimer();



    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' + s : s}`;
    };

    const phaseColors = {
        Idle: 'text-white',
        Prepare: 'text-[#D4FF00]',
        Work: 'text-red-500',
        Rest: 'text-blue-400',
        CycleRest: 'text-blue-600',
        Done: 'text-green-500'
    };

    if (isConfiguring) {
        return (
            <div className="flex flex-col animate-fade-in w-full flex-1 pb-10">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                        }} 
                        className="w-10 h-10 rounded-full bg-[#171717] flex items-center justify-center text-[#A3A3A3] hover:text-white transition-colors cursor-pointer relative z-[70]"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="flex flex-col">
                        <span className="text-xs font-bold text-[#A3A3A3] uppercase tracking-widest pl-1 mb-1">Setup</span>
                        <h1 className="text-3xl font-black tracking-tight text-white">Circuit Timer</h1>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-y-6 gap-x-4 mt-8 flex-1 content-start">
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#A3A3A3]">Prepare</span>
                        <div className="flex items-center gap-2">
                            <button onClick={() => updateConfig('prepareTime', config.prepareTime - 5)} className="w-10 h-10 rounded-full bg-[#171717] flex-shrink-0 flex items-center justify-center text-[#A3A3A3] hover:text-white transition-colors cursor-pointer"><Minus className="w-4 h-4" /></button>
                            <div className="flex-1 flex items-baseline justify-center">
                                <input type="number" value={config.prepareTime || ''} onChange={(e) => updateConfig('prepareTime', parseInt(e.target.value) || 0)} className="w-10 bg-transparent text-center text-lg font-black text-white focus:outline-none focus:border-b-2 focus:border-brand-500 appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none p-0" />
                                <span className="text-[#A3A3A3] text-sm font-bold">s</span>
                            </div>
                            <button onClick={() => updateConfig('prepareTime', config.prepareTime + 5)} className="w-10 h-10 rounded-full bg-[#171717] flex-shrink-0 flex items-center justify-center text-[#A3A3A3] hover:text-white transition-colors cursor-pointer"><Plus className="w-4 h-4" /></button>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#A3A3A3]">Work Time</span>
                        <div className="flex items-center gap-2">
                            <button onClick={() => updateConfig('workTime', config.workTime - 5)} className="w-10 h-10 rounded-full bg-[#171717] flex-shrink-0 flex items-center justify-center text-[#A3A3A3] hover:text-white transition-colors cursor-pointer"><Minus className="w-4 h-4" /></button>
                            <div className="flex-1 flex items-baseline justify-center">
                                <input type="number" value={config.workTime || ''} onChange={(e) => updateConfig('workTime', parseInt(e.target.value) || 0)} className="w-10 bg-transparent text-center text-lg font-black text-white focus:outline-none focus:border-b-2 focus:border-brand-500 appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none p-0" />
                                <span className="text-[#A3A3A3] text-sm font-bold">s</span>
                            </div>
                            <button onClick={() => updateConfig('workTime', config.workTime + 5)} className="w-10 h-10 rounded-full bg-[#171717] flex-shrink-0 flex items-center justify-center text-[#A3A3A3] hover:text-white transition-colors cursor-pointer"><Plus className="w-4 h-4" /></button>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#A3A3A3]">Rest Time</span>
                        <div className="flex items-center gap-2">
                            <button onClick={() => updateConfig('restTime', config.restTime - 5)} className="w-10 h-10 rounded-full bg-[#171717] flex-shrink-0 flex items-center justify-center text-[#A3A3A3] hover:text-white transition-colors cursor-pointer"><Minus className="w-4 h-4" /></button>
                            <div className="flex-1 flex items-baseline justify-center">
                                <input type="number" value={config.restTime || ''} onChange={(e) => updateConfig('restTime', parseInt(e.target.value) || 0)} className="w-10 bg-transparent text-center text-lg font-black text-white focus:outline-none focus:border-b-2 focus:border-brand-500 appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none p-0" />
                                <span className="text-[#A3A3A3] text-sm font-bold">s</span>
                            </div>
                            <button onClick={() => updateConfig('restTime', config.restTime + 5)} className="w-10 h-10 rounded-full bg-[#171717] flex-shrink-0 flex items-center justify-center text-[#A3A3A3] hover:text-white transition-colors cursor-pointer"><Plus className="w-4 h-4" /></button>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#A3A3A3]">Ex. per Cycle</span>
                        <div className="flex items-center gap-2">
                            <button onClick={() => updateConfig('rounds', config.rounds - 1)} className="w-10 h-10 rounded-full bg-[#171717] flex-shrink-0 flex items-center justify-center text-[#A3A3A3] hover:text-white transition-colors cursor-pointer"><Minus className="w-4 h-4" /></button>
                            <div className="flex-1 flex items-center justify-center">
                                <input type="number" value={config.rounds || ''} onChange={(e) => updateConfig('rounds', parseInt(e.target.value) || 0)} className="w-10 bg-transparent text-center text-lg font-black text-white focus:outline-none focus:border-b-2 focus:border-brand-500 appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none p-0" />
                            </div>
                            <button onClick={() => updateConfig('rounds', config.rounds + 1)} className="w-10 h-10 rounded-full bg-[#171717] flex-shrink-0 flex items-center justify-center text-[#A3A3A3] hover:text-white transition-colors cursor-pointer"><Plus className="w-4 h-4" /></button>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#A3A3A3]">Total Cycles</span>
                        <div className="flex items-center gap-2">
                            <button onClick={() => updateConfig('cycles', config.cycles - 1)} className="w-10 h-10 rounded-full bg-[#171717] flex-shrink-0 flex items-center justify-center text-[#A3A3A3] hover:text-white transition-colors cursor-pointer"><Minus className="w-4 h-4" /></button>
                            <div className="flex-1 flex items-center justify-center">
                                <input type="number" value={config.cycles || ''} onChange={(e) => updateConfig('cycles', parseInt(e.target.value) || 0)} className="w-10 bg-transparent text-center text-lg font-black text-white focus:outline-none focus:border-b-2 focus:border-brand-500 appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none p-0" />
                            </div>
                            <button onClick={() => updateConfig('cycles', config.cycles + 1)} className="w-10 h-10 rounded-full bg-[#171717] flex-shrink-0 flex items-center justify-center text-[#A3A3A3] hover:text-white transition-colors cursor-pointer"><Plus className="w-4 h-4" /></button>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#A3A3A3]">Cycle Rest</span>
                        <div className="flex items-center gap-2">
                            <button onClick={() => updateConfig('cycleRestTime', config.cycleRestTime - 10)} className="w-10 h-10 rounded-full bg-[#171717] flex-shrink-0 flex items-center justify-center text-[#A3A3A3] hover:text-white transition-colors cursor-pointer"><Minus className="w-4 h-4" /></button>
                            <div className="flex-1 flex items-baseline justify-center">
                                <input type="number" value={config.cycleRestTime || ''} onChange={(e) => updateConfig('cycleRestTime', parseInt(e.target.value) || 0)} className="w-10 bg-transparent text-center text-lg font-black text-white focus:outline-none focus:border-b-2 focus:border-brand-500 appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none p-0" />
                                <span className="text-[#A3A3A3] text-sm font-bold">s</span>
                            </div>
                            <button onClick={() => updateConfig('cycleRestTime', config.cycleRestTime + 10)} className="w-10 h-10 rounded-full bg-[#171717] flex-shrink-0 flex items-center justify-center text-[#A3A3A3] hover:text-white transition-colors cursor-pointer"><Plus className="w-4 h-4" /></button>
                        </div>
                    </div>
                </div>

                <div className="mt-8 mb-4 max-w-lg mx-auto w-full px-2">
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            startTimer();
                        }}
                        className="w-full py-5 rounded-[2rem] bg-brand-500 text-black font-black uppercase tracking-widest text-[16px] flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(212,255,0,0.3)] active:scale-95 transition-transform cursor-pointer relative z-[20]"
                    >
                        <Play className="w-6 h-6 fill-black" />
                        Start Circuit
                    </button>
                </div>
            </div>
        );
    }

    // Active Timer View
    return (
        <div className="flex flex-col animate-fade-in w-full flex-1 pb-10">
            <div className="flex justify-between items-center relative z-[40]">
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onClose();
                    }} 
                    className="w-10 h-10 rounded-full bg-[#171717]/80 flex items-center justify-center text-[#A3A3A3] hover:text-white transition-colors cursor-pointer relative z-[50]"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsConfiguring(true);
                    }} 
                    className="w-10 h-10 rounded-full bg-[#171717]/80 flex items-center justify-center text-[#A3A3A3] hover:text-white transition-colors cursor-pointer relative z-[50]"
                >
                    <Settings2 className="w-5 h-5" />
                </button>
            </div>

            <div className="flex flex-col items-center justify-center flex-1 py-10 relative z-10">
                <span className={`text-2xl font-black uppercase tracking-widest ${phaseColors[phase]}`}>
                    {phase}
                </span>
                
                <span className={`text-[120px] leading-none font-black tabular-nums tracking-tighter mt-4 ${timeLeft <= 5 && phase === 'Work' ? 'text-brand-500 animate-pulse' : 'text-white'}`}>
                    {formatTime(timeLeft)}
                </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-auto border-t border-[#262626] pt-8 mb-8 relative z-10 max-w-lg mx-auto w-full">
                <div className="flex flex-col items-center bg-[#171717] rounded-3xl p-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#A3A3A3]">Round</span>
                    <span className="text-3xl font-black text-white">{currentRound} / {config.rounds}</span>
                </div>
                <div className="flex flex-col items-center bg-[#171717] rounded-3xl p-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#A3A3A3]">Cycle</span>
                    <span className="text-3xl font-black text-white">{currentCycle} / {config.cycles}</span>
                </div>
            </div>

            <div className="max-w-lg mx-auto flex items-center justify-center gap-6 w-full mt-4 mb-4 relative z-[20]">
                {phase !== 'Done' ? (
                    <>
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                stopTimer();
                                onClose();
                            }}
                            className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white active:scale-95 transition-all cursor-pointer"
                        >
                            <Square className="w-6 h-6 fill-current" />
                        </button>
                        
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                isActive ? pauseTimer() : resumeTimer();
                            }}
                            className="w-24 h-24 rounded-full bg-brand-500 flex items-center justify-center text-black shadow-[0_0_50px_rgba(212,255,0,0.3)] active:scale-95 transition-transform cursor-pointer"
                        >
                            {isActive ? (
                                <Pause className="w-10 h-10 fill-black" />
                            ) : (
                                <Play className="w-10 h-10 fill-black translate-x-1" />
                            )}
                        </button>
                        
                        <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                skipPhase();
                            }}
                            className="w-14 h-14 rounded-full bg-[#171717] flex items-center justify-center text-[#A3A3A3] hover:text-white hover:bg-[#262626] active:scale-95 transition-all cursor-pointer"
                        >
                            <SkipForward className="w-6 h-6 fill-current" />
                        </button>
                    </>
                ) : (
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            stopTimer();
                            onClose();
                        }}
                        className="w-full py-5 rounded-[2rem] bg-brand-500 text-black font-black uppercase tracking-widest text-[16px] flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(212,255,0,0.3)] active:scale-95 transition-transform cursor-pointer relative z-[20]"
                    >
                        Finish Circuit
                    </button>
                )}
            </div>
        </div>
    );
}
