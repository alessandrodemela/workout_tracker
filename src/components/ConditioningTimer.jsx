import React, { useState, useMemo } from 'react';
import { Play, Pause, Plus, Minus, Settings2, ChevronLeft, SkipForward, Square, Clock, Zap, Coffee, Repeat, RefreshCw, Timer, X, ChevronRight } from 'lucide-react';
import { useTimer } from '../context/TimerContext';
import { useWorkout } from '../context/WorkoutContext';
import ConfirmModal from './ConfirmModal';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { API_URL, fetcher } from '../api';

// Reusable config row component
function ConfigRow({ icon, iconBg, title, subtitle, borderHover, value, unit, onDecrement, onIncrement, onChange, disabled }) {
    return (
        <div className={`flex items-center justify-between bg-[#171717]/50 p-4 rounded-3xl border border-[#262626] ${disabled ? 'opacity-20 pointer-events-none' : borderHover} transition-colors flex-shrink-0`}>
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-2xl ${disabled ? 'bg-[#262626] text-[#A3A3A3]' : iconBg}`}>{icon}</div>
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
                        value={disabled ? '-' : (value === 0 ? '' : value)}
                        onChange={onChange}
                        className="w-full bg-transparent text-center text-xl font-black text-white focus:outline-none appearance-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none p-0"
                    />
                    {!disabled && unit && <span className="text-[#A3A3A3] text-sm font-bold">{unit}</span>}
                </div>
                <button onClick={onIncrement} className="w-10 h-10 rounded-full bg-[#262626] flex items-center justify-center text-white hover:bg-brand-500 hover:text-black transition-all"><Plus className="w-4 h-4" /></button>
            </div>
        </div>
    );
}

export default function ConditioningTimer({ onClose }) {
    const navigate = useNavigate();
    const {
        config, updateConfig, isConfiguring, setIsConfiguring,
        phase, timeLeft, currentRound, currentCycle, isActive,
        startTimer, pauseTimer, resumeTimer, stopTimer, skipPhase, activeTimerMode,
        timerExercises, setTimerExercises, currentExercise, nextExercise
    } = useTimer();

    const modeName = activeTimerMode === 'emom' ? 'EMOM' : activeTimerMode === 'amrap' ? 'AMRAP' : 'Circuit';

    const { isActive: isWorkoutActive, cancelWorkout, startWorkout } = useWorkout();
    const { data: exercisesData } = useSWR(`${API_URL}/exercises`, fetcher);
    const masterExercises = exercisesData?.exercises || [];

    const [showStopModal, setShowStopModal] = useState(false);
    const [showWorkoutConflictModal, setShowWorkoutConflictModal] = useState(false);
    const [exerciseSearch, setExerciseSearch] = useState('');
    const [showExercisePicker, setShowExercisePicker] = useState(false);

    const filteredMaster = useMemo(() =>
        masterExercises.filter(e => e.toLowerCase().includes(exerciseSearch.toLowerCase())).slice(0, 20),
        [masterExercises, exerciseSearch]
    );

    const maxExercises = activeTimerMode === 'amrap' ? null : config.rounds;
    const canAddExercise = maxExercises === null || timerExercises.length < maxExercises;
    const isSequenceValid = timerExercises.length === 0 || maxExercises === null || timerExercises.length === maxExercises;
    const missingExercises = maxExercises ? maxExercises - timerExercises.length : 0;

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

    const addExercise = (name) => {
        setTimerExercises(prev => [...prev, name]);
        setExerciseSearch('');
        setShowExercisePicker(false);
    };

    const removeExercise = (idx) => {
        setTimerExercises(prev => prev.filter((_, i) => i !== idx));
    };

    const handleSaveSession = () => {
        let notesText = '';
        if (activeTimerMode === 'emom') notesText = `EMOM: ${config.rounds} Rds of ${config.workTime}s`;
        if (activeTimerMode === 'amrap') notesText = `AMRAP: ${config.workTime / 60} min total`;
        if (activeTimerMode === 'circuit') notesText = `Circuit: ${config.cycles} Cycles × ${config.rounds} Rds (${config.workTime}s work / ${config.restTime}s rest)`;

        let theoreticalDuration = 0;
        const rounds = parseInt(config.rounds) || 0;
        const workTime = parseInt(config.workTime) || 0;
        const restTime = parseInt(config.restTime) || 0;
        const cycles = parseInt(config.cycles) || 0;
        const cycleRestTime = parseInt(config.cycleRestTime) || 0;

        if (activeTimerMode === 'emom') theoreticalDuration = rounds * workTime;
        if (activeTimerMode === 'amrap') theoreticalDuration = workTime;
        if (activeTimerMode === 'circuit') theoreticalDuration = cycles * (rounds * (workTime + restTime) + cycleRestTime);

        // Hand off: build exercise list for ActiveWorkout
        const exercisesForLog = timerExercises.map(name => ({
            name,
            sets: [{ kg: '', reps: '', rpe: 8, completed: false }]
        }));

        stopTimer();

        navigate('/workout', {
            state: {
                isLog: true,
                sessionType: modeName,
                prefillNotes: notesText,
                prefillDuration: theoreticalDuration,
                prefillExercises: exercisesForLog
            }
        });
    };

    // ─── Config View ───────────────────────────────────────────────────────────
    if (isConfiguring) {
        return (
            <div className="h-full flex flex-col animate-fade-in w-full">
                {/* Fixed header */}
                <div className="flex items-center gap-4 flex-shrink-0">
                    <button
                        onClick={(e) => { e.stopPropagation(); onClose(); }}
                        className="w-10 h-10 rounded-full bg-[#171717] flex items-center justify-center text-[#A3A3A3] hover:text-white transition-colors cursor-pointer"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="flex flex-col">
                        <h1 className="text-2xl font-black tracking-tight text-white">Setup your {activeTimerMode === 'circuit' ? 'circuit' : modeName}</h1>
                        {/* <p className="text-[#A3A3A3] text-sm pl-0.5">Setup your {modeName.toLowerCase()}</p> */}
                    </div>
                </div>

                {/* Scrollable config list */}
                <div className="flex flex-col gap-4 mt-6 flex-1 overflow-y-auto pb-4">
                    {/* 1. Prepare */}
                    <ConfigRow
                        icon={<Clock className="w-5 h-5" />} iconBg="bg-brand-500/10 text-brand-500"
                        title="Prepare" subtitle="Get ready" borderHover="hover:border-brand-500/30"
                        value={config.prepareTime} unit="s"
                        onDecrement={() => updateConfig('prepareTime', config.prepareTime - 5)}
                        onIncrement={() => updateConfig('prepareTime', config.prepareTime + 5)}
                        onChange={makeChangeHandler('prepareTime')}
                    />

                    {/* 2. Full Cycles */}
                    {activeTimerMode === 'circuit' && (
                        <ConfigRow
                            icon={<RefreshCw className="w-5 h-5" />} iconBg="bg-brand-500/10 text-brand-500"
                            title="Full Cycles" subtitle="Total repeats" borderHover="hover:border-brand-500/30"
                            value={config.cycles} unit=""
                            onDecrement={() => updateConfig('cycles', config.cycles - 1)}
                            onIncrement={() => updateConfig('cycles', config.cycles + 1)}
                            onChange={makeChangeHandler('cycles')}
                        />
                    )}

                    {/* 3. Exercises / Rounds */}
                    {activeTimerMode !== 'amrap' && (
                        <ConfigRow
                            icon={<Repeat className="w-5 h-5" />} iconBg="bg-brand-500/10 text-brand-500"
                            title={activeTimerMode === 'emom' ? "Total Rounds" : "Exercises"} subtitle={activeTimerMode === 'emom' ? "Total intervals" : "Per cycle"} borderHover="hover:border-brand-500/30"
                            value={config.rounds} unit=""
                            onDecrement={() => updateConfig('rounds', config.rounds - 1)}
                            onIncrement={() => updateConfig('rounds', config.rounds + 1)}
                            onChange={makeChangeHandler('rounds')}
                        />
                    )}

                    {/* 4. Work Time */}
                    {activeTimerMode === 'amrap' ? (
                        <ConfigRow
                            icon={<Zap className="w-5 h-5" />} iconBg="bg-red-500/10 text-red-500"
                            title="Time" subtitle="Total duration" borderHover="hover:border-red-500/30"
                            value={Math.floor(config.workTime / 60)} unit="min"
                            onDecrement={() => updateConfig('workTime', config.workTime - 60)}
                            onIncrement={() => updateConfig('workTime', config.workTime + 60)}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                updateConfig('workTime', val === '' ? 0 : parseInt(val) * 60);
                            }}
                        />
                    ) : (
                        <ConfigRow
                            icon={<Zap className="w-5 h-5" />} iconBg="bg-red-500/10 text-red-500"
                            title={activeTimerMode === 'emom' ? "Every" : "Work Time"} subtitle={activeTimerMode === 'emom' ? "Interval length" : "High intensity"} borderHover="hover:border-red-500/30"
                            value={config.workTime} unit="s"
                            onDecrement={() => updateConfig('workTime', config.workTime - 5)}
                            onIncrement={() => updateConfig('workTime', config.workTime + 5)}
                            onChange={makeChangeHandler('workTime')}
                        />
                    )}

                    {/* 5. Rest Time */}
                    {activeTimerMode === 'circuit' && (
                        <ConfigRow
                            icon={<Coffee className="w-5 h-5" />} iconBg="bg-blue-500/10 text-blue-400"
                            title="Rest Time" subtitle="Between exercises" borderHover="hover:border-blue-500/30"
                            value={config.restTime} unit="s"
                            onDecrement={() => updateConfig('restTime', config.restTime - 5)}
                            onIncrement={() => updateConfig('restTime', config.restTime + 5)}
                            onChange={makeChangeHandler('restTime')}
                            disabled={config.rounds <= 1}
                        />
                    )}

                    {/* 6. Cycle Rest */}
                    {activeTimerMode === 'circuit' && (
                        <ConfigRow
                            icon={<Timer className="w-5 h-5" />} iconBg="bg-blue-500/10 text-blue-600"
                            title="Cycle Rest" subtitle="Between cycles" borderHover="hover:border-blue-500/30"
                            value={config.cycleRestTime} unit="s"
                            onDecrement={() => updateConfig('cycleRestTime', config.cycleRestTime - 5)}
                            onIncrement={() => updateConfig('cycleRestTime', config.cycleRestTime + 5)}
                            onChange={makeChangeHandler('cycleRestTime')}
                            disabled={config.cycles <= 1}
                        />
                    )}

                    {/* ─── Exercise Sequence ─── */}
                    <div className="flex flex-col gap-3 bg-[#171717]/30 p-4 rounded-3xl border border-[#262626]">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col">
                                <span className="text-xs font-black uppercase tracking-widest text-white">Exercise Sequence</span>
                                <span className="text-[10px] font-bold text-[#A3A3A3]">
                                    {maxExercises === null ? "Optional" : 
                                     timerExercises.length === 0 ? `Optional (or add exactly ${maxExercises})` :
                                     `${timerExercises.length} / ${maxExercises} added`}
                                </span>
                            </div>
                            {canAddExercise && (
                                <button
                                    onClick={() => setShowExercisePicker(v => !v)}
                                    className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-black hover:bg-brand-400 transition-all"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* Exercise picker dropdown */}
                        {showExercisePicker && (
                            <div className="flex flex-col gap-2 animate-fade-in">
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="Search exercises..."
                                    value={exerciseSearch}
                                    onChange={e => setExerciseSearch(e.target.value)}
                                    className="w-full bg-[#0A0A0A] border border-[#404040] rounded-2xl px-4 py-3 text-white text-sm placeholder-[#A3A3A3] focus:outline-none focus:border-brand-500"
                                />
                                <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                                    {filteredMaster.map(ex => (
                                        <button
                                            key={ex}
                                            onClick={() => addExercise(ex)}
                                            className="text-left px-4 py-3 text-sm font-bold text-white bg-[#0A0A0A] border border-[#262626] rounded-xl hover:border-brand-500 hover:text-brand-500 transition-all flex items-center justify-between"
                                        >
                                            {ex}
                                            <ChevronRight className="w-4 h-4 opacity-40" />
                                        </button>
                                    ))}
                                    {filteredMaster.length === 0 && (
                                        <p className="text-xs text-[#A3A3A3] text-center py-2">No exercises found</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Selected exercises list */}
                        {timerExercises.length > 0 ? (
                            <div className="flex flex-col gap-2">
                                {timerExercises.map((ex, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-[#0A0A0A] border border-[#262626] rounded-xl px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <span className="w-5 h-5 rounded-full bg-brand-500/20 text-brand-500 text-[10px] font-black flex items-center justify-center">{idx + 1}</span>
                                            <span className="text-sm font-bold text-white">{ex}</span>
                                        </div>
                                        <button onClick={() => removeExercise(idx)} className="text-[#A3A3A3] hover:text-red-500 transition-colors">
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-[#A3A3A3] text-center py-1">No exercises selected — timer will run without guidance</p>
                        )}
                    </div>
                </div>

                {/* Sticky Start button */}
                <div className="flex-shrink-0 py-4 border-t border-[#262626]">
                    {!isSequenceValid ? (
                        <button
                            disabled
                            className="w-full py-5 rounded-[2rem] bg-[#171717] text-[#A3A3A3] font-black uppercase tracking-widest text-[16px] flex items-center justify-center gap-2 cursor-not-allowed border border-[#262626]"
                        >
                            {missingExercises < 0 
                                ? `Remove ${Math.abs(missingExercises)} ${Math.abs(missingExercises) === 1 ? 'exercise' : 'exercises'}`
                                : `Add ${missingExercises} more ${missingExercises === 1 ? 'exercise' : 'exercises'}`}
                        </button>
                    ) : (
                        <button
                            onClick={(e) => { e.stopPropagation(); isWorkoutActive ? setShowWorkoutConflictModal(true) : startTimer(timerExercises); }}
                            className="w-full py-5 rounded-[2rem] bg-brand-500 text-black font-black uppercase tracking-widest text-[16px] flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(212,255,0,0.3)] active:scale-95 transition-transform cursor-pointer"
                        >
                            <Play className="w-6 h-6 fill-black" />
                            Start {modeName}
                        </button>
                    )}
                </div>

                <ConfirmModal
                    isOpen={showWorkoutConflictModal}
                    onClose={() => {
                        setShowWorkoutConflictModal(false);
                        onClose();
                    }}
                    onConfirm={() => {
                        cancelWorkout();
                        setShowWorkoutConflictModal(false);
                        startTimer(timerExercises);
                    }}
                    title="Stop Active Workout?"
                    message={`You have a workout session active. Starting a ${modeName.toLowerCase()} will end your current workout. Continue?`}
                    confirmText={`Stop Workout & Start ${modeName}`}
                    cancelText="Back to Workout"
                    type="danger"
                />
            </div>
        );
    }

    // ─── Active Timer View ─────────────────────────────────────────────────────
    return (
        <div className="h-full flex flex-col animate-fade-in w-full">
            {/* Top bar */}
            <div className="flex justify-between items-center flex-shrink-0">
                <button
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                    className="w-10 h-10 rounded-full bg-[#171717]/80 flex items-center justify-center text-[#A3A3A3] hover:text-white transition-colors cursor-pointer"
                >
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="w-10 h-10" />
            </div>

            {/* Big timer display — grows to fill space */}
            <div className="flex flex-col items-center justify-center flex-1 py-8 px-4 w-full">
                {/* Current exercise guidance */}
                {currentExercise && phase === 'Work' && (
                    <div className="flex flex-col items-center gap-1 animate-fade-in mb-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A3A3A3]">Now</span>
                        <span className="text-3xl font-black text-white tracking-tight text-center">{currentExercise}</span>
                    </div>
                )}
                {phase === 'Prepare' && currentExercise && (
                    <div className="flex flex-col items-center gap-1 animate-fade-in mb-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A3A3A3]">Get ready for</span>
                        <span className="text-3xl font-black text-white tracking-tight text-center">{currentExercise}</span>
                    </div>
                )}
                {phase === 'Rest' && nextExercise && currentRound < config.rounds && (
                    <div className="flex flex-col items-center gap-1 animate-fade-in mb-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A3A3A3]">Up Next</span>
                        <span className="text-3xl font-black text-white tracking-tight text-center">{nextExercise}</span>
                    </div>
                )}
                {phase === 'CycleRest' && timerExercises.length > 0 && currentCycle < config.cycles && (
                    <div className="flex flex-col items-center gap-1 animate-fade-in mb-4">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A3A3A3]">Next Cycle Starts With</span>
                        <span className="text-3xl font-black text-white tracking-tight text-center">{timerExercises[0]}</span>
                    </div>
                )}

                <span className={`text-2xl font-black uppercase tracking-widest ${phaseColors[phase]}`}>
                    {phase === 'CycleRest' ? 'Cycle Rest' : phase}
                </span>
                <span className={`text-[110px] leading-none font-black tabular-nums tracking-tighter ${timeLeft <= 5 && phase === 'Work' ? 'text-brand-500 animate-pulse' : 'text-white'}`}>
                    {formatTime(timeLeft)}
                </span>

                {/* Next exercise preview styled like Hyrox */}
                {nextExercise && phase === 'Work' && currentRound < config.rounds && (
                    <div className="w-full mt-8 flex items-center justify-between px-6 py-4 bg-[#0A0A0A] border border-[#262626] rounded-2xl opacity-70">
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#A3A3A3]">Next</span>
                            <span className="text-sm font-bold text-white">{nextExercise}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Round / Cycle counters */}
            {activeTimerMode !== 'amrap' && (
                <div className={`grid ${activeTimerMode === 'circuit' ? 'grid-cols-2' : 'grid-cols-1'} gap-4 border-t border-[#262626] pt-5 mb-5 flex-shrink-0`}>
                    <div className="flex flex-col items-center bg-[#171717] rounded-3xl p-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#A3A3A3]">Round</span>
                        <span className="text-3xl font-black text-white">{currentRound} / {config.rounds}</span>
                    </div>
                    {activeTimerMode === 'circuit' && (
                        <div className="flex flex-col items-center bg-[#171717] rounded-3xl p-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#A3A3A3]">Cycle</span>
                            <span className="text-3xl font-black text-white">{currentCycle} / {config.cycles}</span>
                        </div>
                    )}
                </div>
            )}

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
                    <div className="flex gap-3 w-full">
                        <button
                            onClick={(e) => { e.stopPropagation(); stopTimer(); onClose(); }}
                            className="flex-1 py-5 rounded-[2rem] bg-[#171717] border border-[#262626] text-[#A3A3A3] font-black uppercase tracking-widest text-[16px] flex items-center justify-center gap-2 hover:text-white transition-all cursor-pointer"
                        >
                            Discard
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleSaveSession(); }}
                            className="flex-[2] py-5 rounded-[2rem] bg-brand-500 text-black font-black uppercase tracking-widest text-[16px] flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(212,255,0,0.3)] active:scale-95 transition-transform cursor-pointer"
                        >
                            Log {modeName}
                        </button>
                    </div>
                )}
            </div>

            <ConfirmModal
                isOpen={showStopModal}
                onClose={() => setShowStopModal(false)}
                onConfirm={() => { stopTimer(); onClose(); setShowStopModal(false); }}
                title={`Stop ${modeName}?`}
                message="Are you sure you want to stop the current session? All progress will be lost."
                confirmText={`Stop ${modeName}`}
                cancelText="Keep Going"
                type="danger"
            />
        </div>
    );
}
