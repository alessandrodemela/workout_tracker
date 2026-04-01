import React, { useState } from 'react';
import { Play, Pause, Plus, Minus, Settings2, ChevronLeft, SkipForward, Square, Clock, Zap, Coffee, Repeat, RefreshCw, Timer } from 'lucide-react';
import { useTimer } from '../context/TimerContext';
import ConfirmModal from './ConfirmModal';

// Reusable config row component
function ConfigRow({ icon, iconBg, title, subtitle, borderHover, value, unit, onDecrement, onIncrement, onChange }) {
    return (
        <div className={`flex items-center justify-between bg-[#171717]/50 p-4 rounded-3xl border border-[#262626] ${borderHover} transition-colors flex-shrink-0`}>
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${iconBg}`}>{icon}</div>
                <div className="flex flex-col">
                    <span className="text-xs font-black uppercase tracking-widest text-white">{title}</span>
                    <span className="text-[10px] font-bold text-[#A3A3A3]">{subtitle}</span>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <button onClick={onDecrement} className="w-10 h-10 rounded-full bg-[#262626] flex items-center justify-center text-white hover:bg-brand-500 hover:text-black transition-all"><Minus className="w-4 h-4" /></button>
                <div className={`${unit ? 'w-14 flex items-baseline justify-center' : 'w-14 flex items-center justify-center'}`}>
                    <input
                        type="number"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={value === 0 ? '' : value}
                        onChange={onChange}
                        className="w-full bg-transparent text-center text-xl font-black text-white focus:outline-none appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none p-0"
                    />
                    {unit && <span className="text-[#A3A3A3] text-sm font-bold">{unit}</span>}
                </div>
                <button onClick={onIncrement} className="w-10 h-10 rounded-full bg-[#262626] flex items-center justify-center text-white hover:bg-brand-500 hover:text-black transition-all"><Plus className="w-4 h-4" /></button>
            </div>
        </div>
    );
}

export default function ConditioningTimer({ onClose }) {
    const {
        config, updateConfig, isConfiguring, setIsConfiguring,
        phase, timeLeft, currentRound, currentCycle, isActive,
        startTimer, pauseTimer, resumeTimer, stopTimer, skipPhase
    } = useTimer();

    const [showStopModal, setShowStopModal] = useState(false);

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

    const makeChangeHandler = (key) => (e) => {
        const val = e.target.value.replace(/\D/g, '');
        updateConfig(key, val === '' ? 0 : parseInt(val));
    };

    // ─── Config View ───────────────────────────────────────────────────────────
    if (isConfiguring) {
        return (
            <div className="h-full flex flex-col animate-fade-in w-full">
                {/* Fixed header */}
                <div className="flex items-center gap-4 flex-shrink-0 pt-6">
                    <button
                        onClick={(e) => { e.stopPropagation(); onClose(); }}
                        className="w-10 h-10 rounded-full bg-[#171717] flex items-center justify-center text-[#A3A3A3] hover:text-white transition-colors cursor-pointer"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="flex flex-col">
                        <h1 className="text-3xl font-black tracking-tight text-white">Timers</h1>
                        <p className="text-[#A3A3A3] text-sm pl-0.5">Setup your circuit</p>
                    </div>
                </div>

                {/* Scrollable config list */}
                <div className="flex flex-col gap-4 mt-6 flex-1 overflow-y-auto pb-4">
                    <ConfigRow
                        icon={<Clock className="w-5 h-5" />} iconBg="bg-brand-500/10 text-brand-500"
                        title="Prepare" subtitle="Get ready" borderHover="hover:border-brand-500/30"
                        value={config.prepareTime} unit="s"
                        onDecrement={() => updateConfig('prepareTime', config.prepareTime - 5)}
                        onIncrement={() => updateConfig('prepareTime', config.prepareTime + 5)}
                        onChange={makeChangeHandler('prepareTime')}
                    />
                    <ConfigRow
                        icon={<Zap className="w-5 h-5" />} iconBg="bg-red-500/10 text-red-500"
                        title="Work Time" subtitle="High intensity" borderHover="hover:border-red-500/30"
                        value={config.workTime} unit="s"
                        onDecrement={() => updateConfig('workTime', config.workTime - 5)}
                        onIncrement={() => updateConfig('workTime', config.workTime + 5)}
                        onChange={makeChangeHandler('workTime')}
                    />
                    <ConfigRow
                        icon={<Coffee className="w-5 h-5" />} iconBg="bg-blue-500/10 text-blue-400"
                        title="Rest Time" subtitle="Recovery" borderHover="hover:border-blue-500/30"
                        value={config.restTime} unit="s"
                        onDecrement={() => updateConfig('restTime', config.restTime - 5)}
                        onIncrement={() => updateConfig('restTime', config.restTime + 5)}
                        onChange={makeChangeHandler('restTime')}
                    />
                    <ConfigRow
                        icon={<Repeat className="w-5 h-5" />} iconBg="bg-brand-500/10 text-brand-500"
                        title="Exercises" subtitle="Per cycle" borderHover="hover:border-brand-500/30"
                        value={config.rounds} unit=""
                        onDecrement={() => updateConfig('rounds', config.rounds - 1)}
                        onIncrement={() => updateConfig('rounds', config.rounds + 1)}
                        onChange={makeChangeHandler('rounds')}
                    />
                    <ConfigRow
                        icon={<RefreshCw className="w-5 h-5" />} iconBg="bg-brand-500/10 text-brand-500"
                        title="Full Cycles" subtitle="Total repeats" borderHover="hover:border-brand-500/30"
                        value={config.cycles} unit=""
                        onDecrement={() => updateConfig('cycles', config.cycles - 1)}
                        onIncrement={() => updateConfig('cycles', config.cycles + 1)}
                        onChange={makeChangeHandler('cycles')}
                    />
                    <ConfigRow
                        icon={<Timer className="w-5 h-5" />} iconBg="bg-blue-500/10 text-blue-600"
                        title="Cycle Rest" subtitle="Between cycles" borderHover="hover:border-blue-500/30"
                        value={config.cycleRestTime} unit="s"
                        onDecrement={() => updateConfig('cycleRestTime', config.cycleRestTime - 10)}
                        onIncrement={() => updateConfig('cycleRestTime', config.cycleRestTime + 10)}
                        onChange={makeChangeHandler('cycleRestTime')}
                    />
                </div>

                {/* Sticky Start button */}
                <div className="flex-shrink-0 py-4 border-t border-[#262626]">
                    <button
                        onClick={(e) => { e.stopPropagation(); startTimer(); }}
                        className="w-full py-5 rounded-[2rem] bg-brand-500 text-black font-black uppercase tracking-widest text-[16px] flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(212,255,0,0.3)] active:scale-95 transition-transform cursor-pointer"
                    >
                        <Play className="w-6 h-6 fill-black" />
                        Start Circuit
                    </button>
                </div>
            </div>
        );
    }

    // ─── Active Timer View ─────────────────────────────────────────────────────
    return (
        <div className="h-full flex flex-col animate-fade-in w-full">
            {/* Top bar */}
            <div className="flex justify-between items-center flex-shrink-0 pt-6">
                <button
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                    className="w-10 h-10 rounded-full bg-[#171717]/80 flex items-center justify-center text-[#A3A3A3] hover:text-white transition-colors cursor-pointer"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); setIsConfiguring(true); }}
                    className="w-10 h-10 rounded-full bg-[#171717]/80 flex items-center justify-center text-[#A3A3A3] hover:text-white transition-colors cursor-pointer"
                >
                    <Settings2 className="w-5 h-5" />
                </button>
            </div>

            {/* Big timer display — grows to fill space */}
            <div className="flex flex-col items-center justify-center flex-1">
                <span className={`text-2xl font-black uppercase tracking-widest ${phaseColors[phase]}`}>
                    {phase}
                </span>
                <span className={`text-[110px] leading-none font-black tabular-nums tracking-tighter mt-2 ${timeLeft <= 5 && phase === 'Work' ? 'text-brand-500 animate-pulse' : 'text-white'}`}>
                    {formatTime(timeLeft)}
                </span>
            </div>

            {/* Round / Cycle counters */}
            <div className="grid grid-cols-2 gap-4 border-t border-[#262626] pt-5 mb-5 flex-shrink-0">
                <div className="flex flex-col items-center bg-[#171717] rounded-3xl p-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#A3A3A3]">Round</span>
                    <span className="text-3xl font-black text-white">{currentRound} / {config.rounds}</span>
                </div>
                <div className="flex flex-col items-center bg-[#171717] rounded-3xl p-4">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#A3A3A3]">Cycle</span>
                    <span className="text-3xl font-black text-white">{currentCycle} / {config.cycles}</span>
                </div>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-6 flex-shrink-0 pb-[80px]">
                {phase !== 'Done' ? (
                    <>
                        <button
                            onClick={(e) => { e.stopPropagation(); setShowStopModal(true); }}
                            className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white active:scale-95 transition-all cursor-pointer"
                        >
                            <Square className="w-6 h-6 fill-current" />
                        </button>

                        <button
                            onClick={(e) => { e.stopPropagation(); isActive ? pauseTimer() : resumeTimer(); }}
                            className="w-24 h-24 rounded-full bg-brand-500 flex items-center justify-center text-black shadow-[0_0_50px_rgba(212,255,0,0.3)] active:scale-95 transition-transform cursor-pointer"
                        >
                            {isActive ? (
                                <Pause className="w-10 h-10 fill-black" />
                            ) : (
                                <Play className="w-10 h-10 fill-black translate-x-1" />
                            )}
                        </button>

                        <button
                            onClick={(e) => { e.stopPropagation(); skipPhase(); }}
                            className="w-14 h-14 rounded-full bg-[#171717] flex items-center justify-center text-[#A3A3A3] hover:text-white hover:bg-[#262626] active:scale-95 transition-all cursor-pointer"
                        >
                            <SkipForward className="w-6 h-6 fill-current" />
                        </button>
                    </>
                ) : (
                    <button
                        onClick={(e) => { e.stopPropagation(); stopTimer(); onClose(); }}
                        className="w-full py-5 rounded-[2rem] bg-brand-500 text-black font-black uppercase tracking-widest text-[16px] flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(212,255,0,0.3)] active:scale-95 transition-transform cursor-pointer"
                    >
                        Finish Circuit
                    </button>
                )}
            </div>

            <ConfirmModal
                isOpen={showStopModal}
                onClose={() => setShowStopModal(false)}
                onConfirm={() => { stopTimer(); onClose(); setShowStopModal(false); }}
                title="Stop Circuit?"
                message="Are you sure you want to stop the current circuit? All progress will be lost."
                confirmText="Stop Circuit"
                cancelText="Keep Going"
                type="danger"
            />
        </div>
    );
}
