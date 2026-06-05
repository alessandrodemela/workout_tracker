import React, { useMemo, useState } from 'react';
import useSWR from 'swr';
import { ChevronDown, Clock, Dumbbell, TrendingUp, Calendar, Search, Activity } from 'lucide-react';
import { API_URL, fetcher } from '../api';

export default function History({ isEmbedded = false }) {
    const { data: history, error } = useSWR(`${API_URL}/workout-history`, fetcher);
    const [timeFilter, setTimeFilter] = useState('All Time');
    const [expandedSession, setExpandedSession] = useState(null);

    const MUSCLE_GROUP_COLORS = {
        'Chest': '#FF6B6B',
        'Back': '#4ECDC4',
        'Legs': '#FFE66D',
        'Shoulders': '#A8E6CF',
        'Arms': '#FF8B94',
        'Biceps': '#FF8B94',
        'Triceps': '#FF8B94',
        'Core': '#B8B8FF',
        'Forearms': '#FFB347',
        'Calves': '#FFD1DC',
        'Glutes': '#CBAACB',
        'Quadriceps': '#FDFD96',
        'Quads': '#FDFD96',
        'Hamstrings': '#FFDAC1',
        'Abs': '#AEC6CF',
        'Cardio': '#FFB7B2',
    };

    const groupedSessions = useMemo(() => {
        if (!history?.workouts && !history?.functional) return [];
        const combined = [...(history?.workouts || []), ...(history?.functional || [])];
        const groups = {};

        combined.forEach(log => {
            const isFunctional = 'Duration_Seconds' in log;
            const key = isFunctional ? `${log.Date}_${log.Session_Type}_${log.id || Math.random()}` : `${log.Date}_${log.Session_Type}`;

            if (!groups[key]) {
                const durationMatch = log.notes?.match(/\[\[D:(\d+)\]\]/);
                let actualDuration = durationMatch ? Math.round(parseInt(durationMatch[1]) / 60) : null;
                
                if (isFunctional && log.Duration_Seconds) {
                    actualDuration = Math.round(log.Duration_Seconds / 60);
                }

                groups[key] = {
                    key,
                    date: log.Date,
                    sessionType: log.Session_Type,
                    exercises: [],
                    totalSets: 0,
                    totalVolume: 0,
                    duration: actualDuration,
                    timeFallback: 0,
                    muscleGroups: new Set(),
                    isFunctional: isFunctional,
                    notes: log.notes,
                    splits: log.Splits
                };
            }

            if (!isFunctional) {
                groups[key].exercises.push(log);
                groups[key].totalSets += parseInt(log.Sets) || 0;
                if (log.Target_Muscle) groups[key].muscleGroups.add(log.Target_Muscle);

                const weightMatch = log.notes?.match(/\[\[W:([\d.,]+)\]\]/);
                const repsArr = (log.Reps || '').toString().split(',').map(r => parseInt(r.trim()) || 0);
                
                let exerciseVolume = 0;
                if (weightMatch) {
                    const weights = weightMatch[1].split(',').map(w => parseFloat(w.trim()) || 0);
                    repsArr.forEach((reps, i) => {
                        const weight = weights[i] !== undefined ? weights[i] : (weights[weights.length - 1] || 0);
                        exerciseVolume += reps * weight;
                    });
                } else {
                    const kg = parseFloat(log.Kg) || 0;
                    exerciseVolume = repsArr.reduce((acc, reps) => acc + (reps * kg), 0);
                }
                
                groups[key].totalVolume += exerciseVolume / 1000;
            }
        });

        return Object.values(groups).sort((a, b) => new Date(b.date) - new Date(a.date)).map(s => {
            s.timeDisplay = s.duration !== null ? s.duration : Math.round(s.totalSets * 3.5);
            s.muscleGroupList = Array.from(s.muscleGroups);
            return s;
        });
    }, [history]);

    const filteredSessions = useMemo(() => {
        if (timeFilter === 'All Time') return groupedSessions;
        const now = new Date();
        return groupedSessions.filter(s => {
            const d = new Date(s.date);
            const diffDays = (now - d) / (1000 * 60 * 60 * 24);
            if (timeFilter === 'This Week') return diffDays <= 7;
            if (timeFilter === 'This Month') return diffDays <= 30;
            return true;
        });
    }, [groupedSessions, timeFilter]);

    const weeklyStats = useMemo(() => {
        const now = new Date();
        const stats = [];

        for (let i = 3; i >= 0; i--) {
            const start = new Date(now);
            start.setDate(now.getDate() - now.getDay() - i * 7);
            start.setHours(0, 0, 0, 0);
            const end = new Date(start);
            end.setDate(start.getDate() + 7);

            const workoutsInWeek = groupedSessions.filter(s => {
                const d = new Date(s.date);
                return d >= start && d < end;
            });

            stats.push({
                label: i === 0 ? 'This' : i === 1 ? 'Last' : `${i + 1}w`,
                volume: workoutsInWeek.reduce((acc, curr) => acc + curr.totalVolume, 0),
                sessions: workoutsInWeek.length
            });
        }

        const maxVol = Math.max(...stats.map(s => s.volume), 1);
        return stats.map(s => ({ ...s, height: Math.max((s.volume / maxVol) * 100, 10) }));
    }, [groupedSessions]);

    const stats = useMemo(() => {
        const totalWorkouts = filteredSessions.length;
        const totalVolume = filteredSessions.reduce((acc, curr) => acc + curr.totalVolume, 0);
        const avgTime = totalWorkouts > 0
            ? Math.round(filteredSessions.reduce((acc, curr) => acc + (curr.duration || curr.timeDisplay), 0) / totalWorkouts)
            : 0;
        return { totalWorkouts, totalVolume: totalVolume.toFixed(1), avgTime };
    }, [filteredSessions]);

    const getRelativeDate = (dateStr) => {
        if (!dateStr) return 'UNKNOWN';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr.toUpperCase();
        d.setHours(0, 0, 0, 0);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const diff = Math.floor((today - d) / (1000 * 60 * 60 * 24));
        if (diff === 0) return 'TODAY';
        if (diff === 1) return 'YESTERDAY';
        if (diff < 7 && diff > 0) return `${diff} DAYS AGO`;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
    };

    const formatTime = (mins) => {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    if (error) return (
        <div className="p-6 text-brand-500 font-bold text-center">
            <p>Connection error.</p>
            <p className="text-[10px] opacity-50 mt-2 font-mono uppercase">{error?.message || JSON.stringify(error)}</p>
        </div>
    );

    return (
        <div className={`flex flex-col gap-6 ${isEmbedded ? '' : 'pb-32'} animate-fade-in`}>
            {!isEmbedded && (
                <>
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-black tracking-tight text-white uppercase">History</h1>
                        <p className="text-xs font-bold text-brand-500 uppercase tracking-widest">Training Log</p>
                    </div>
                </div>

                    <div className="grid grid-cols-3 gap-3">
                        <div className="card-glass p-4 rounded-3xl flex flex-col justify-between">
                            <span className="text-[9px] font-black uppercase tracking-widest text-[#A3A3A3] mb-1">Workouts</span>
                            <span className="text-2xl font-black text-white">{stats.totalWorkouts}</span>
                        </div>
                        <div className="card-glass p-4 rounded-3xl flex flex-col justify-between">
                            <span className="text-[9px] font-black uppercase tracking-widest text-[#A3A3A3] mb-1">Volume</span>
                            <div className="flex items-baseline gap-0.5">
                                <span className="text-2xl font-black text-white">{stats.totalVolume}</span>
                                <span className="text-xs font-bold text-[#A3A3A3]">t</span>
                            </div>
                        </div>
                        <div className="card-glass p-4 rounded-3xl flex flex-col justify-between">
                            <span className="text-[9px] font-black uppercase tracking-widest text-[#A3A3A3] mb-1">Avg Time</span>
                            <div className="flex items-baseline gap-0.5">
                                <span className="text-2xl font-black text-white">{stats.avgTime}</span>
                                <span className="text-xs font-bold text-[#A3A3A3]">m</span>
                            </div>
                        </div>
                    </div>
                </>
            )}

            <div className={`flex items-center bg-[#0A0A0A] border border-[#171717] rounded-full p-1 ${isEmbedded ? 'mt-2' : ''}`}>
                {['All Time', 'This Week', 'This Month'].map(f => (
                    <button
                        key={f}
                        onClick={() => setTimeFilter(f)}
                        className={`flex-1 py-3 text-xs font-bold rounded-full transition-all ${timeFilter === f ? 'bg-[#D4FF00] text-black shadow-md' : 'text-[#A3A3A3] hover:text-white'}`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            <div className="card-glass p-6 rounded-[2.5rem] flex flex-col gap-6 border-[#171717]">
                <div className="flex justify-between items-end">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A3A3A3]">Volume Progression</h3>
                    <span className="text-[10px] font-bold text-brand-500 uppercase tracking-widest">Last 4 Weeks</span>
                </div>
                <div className="flex items-end justify-between h-40 gap-1.5 mt-2 px-1">
                    {weeklyStats.map((w, idx) => {
                        const isCurrent = idx === 3;
                        return (
                            <div key={idx} className="flex flex-col items-center flex-1 h-full gap-2 justify-end">
                                {/* Volume Label */}
                                <span className={`text-[9px] font-black ${isCurrent ? 'text-[#D4FF00]' : 'text-[#404040]'}`}>
                                    {w.volume.toFixed(1)}t
                                </span>
                                
                                {/* The Bar - Mimicking ExerciseDatabase style */}
                                <div
                                    className="w-full transition-all duration-700 relative group"
                                    style={{ 
                                        height: `${w.height}%`,
                                        background: isCurrent
                                            ? 'linear-gradient(to bottom, #D4FF00, rgba(212,255,0,0.3))'
                                            : 'linear-gradient(to bottom, #2a2a2a, #171717)',
                                        boxShadow: isCurrent ? '0 0 12px rgba(212,255,0,0.2)' : 'none',
                                        borderRadius: '6px 6px 2px 2px',
                                    }}
                                >
                                </div>
                                
                                {/* Labels */}
                                <div className="flex flex-col items-center gap-0.5">
                                    <span className={`text-[9px] font-black ${isCurrent ? 'text-[#D4FF00]' : 'text-white'}`}>{w.sessions}×</span>
                                    <span className="text-[9px] font-bold text-[#404040] uppercase tracking-tighter">{w.label}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="flex flex-col gap-4">
                {filteredSessions.map((session, i) => (
                    <div key={i} className={`card-glass p-6 rounded-[2.5rem] flex flex-col border-[#171717] hover:border-[#262626] transition-all relative overflow-hidden group ${expandedSession === session.key ? 'bg-black/40 ring-1 ring-white/5 shadow-2xl' : ''}`}>
                        <div className="flex justify-between items-start">
                            <div className="flex flex-col gap-1.5">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#A3A3A3]">{getRelativeDate(session.date)}</span>
                                <h2 className="text-3xl font-black text-white tracking-tight leading-none">{session.sessionType || 'Workout'}</h2>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <button
                                    onClick={() => setExpandedSession(expandedSession === session.key ? null : session.key)}
                                    className={`w-10 h-10 rounded-2xl bg-[#171717] flex items-center justify-center text-[#A3A3A3] transition-all ${expandedSession === session.key ? 'rotate-180 bg-[#D4FF00] text-black shadow-lg shadow-brand-500/20' : 'group-hover:text-white group-hover:bg-[#262626]'}`}
                                >
                                    <ChevronDown className="w-5 h-5" />
                                </button>
                                <div className="flex gap-1 justify-end">
                                    {session.muscleGroupList.map(muscle => (
                                        <div key={muscle} className="w-2 h-2 rounded-full" style={{ background: MUSCLE_GROUP_COLORS[muscle] || '#A3A3A3' }}></div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {session.sessionType === 'Corsa' ? (
                            <div className="flex items-center gap-5 text-[#A3A3A3] text-[13px] font-bold tracking-tight mt-5">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-[#D4FF00]" />
                                    <span>{formatTime(session.timeDisplay)}</span>
                                </div>
                                {session.splits?.[0]?.distance && (
                                    <div className="flex items-center gap-2">
                                        <Activity className="w-4 h-4 text-[#D4FF00]" />
                                        <span>{session.splits[0].distance} km</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-5 text-[#A3A3A3] text-[13px] font-bold tracking-tight mt-5">
                                <div className="flex items-center gap-2">
                                    <Clock className={`w-4 h-4 ${session.duration ? 'text-[#D4FF00]' : 'opacity-70'}`} />
                                    <span>{formatTime(session.timeDisplay)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Dumbbell className="w-4 h-4 opacity-70" />
                                    <span>{session.totalSets} sets</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <TrendingUp className="w-4 h-4 opacity-70" />
                                    <span>{session.totalVolume.toFixed(1)}t</span>
                                </div>
                            </div>
                        )}

                        {expandedSession === session.key && (
                            <div className="mt-8 flex flex-col gap-8 border-t border-[#171717] pt-8 animate-slide-down">
                                {session.isFunctional ? (
                                    session.sessionType === 'Corsa' ? (
                                        <div className="flex flex-col gap-4">
                                            <div className="grid grid-cols-2 gap-3">
                                                {session.splits?.[0]?.max_time && (
                                                    <div className="bg-[#171717] border border-[#262626] p-4 rounded-2xl flex flex-col gap-1">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-[#A3A3A3]">Max Time</span>
                                                        <span className="text-lg font-black text-white">{session.splits[0].max_time} min</span>
                                                    </div>
                                                )}
                                                {session.splits?.[0]?.distance && (
                                                    <div className="bg-[#171717] border border-[#262626] p-4 rounded-2xl flex flex-col gap-1">
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-[#A3A3A3]">Distance</span>
                                                        <span className="text-lg font-black text-white">{session.splits[0].distance} km</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="bg-[#171717] border border-[#262626] p-4 rounded-2xl flex flex-col gap-2">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-[#A3A3A3]">Session Notes</span>
                                                <p className="text-sm font-bold text-white whitespace-pre-wrap">{session.notes || 'No notes for this session.'}</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-4">
                                            <div className="bg-[#171717] border border-[#262626] p-4 rounded-2xl flex flex-col gap-2">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-[#A3A3A3]">Session Notes</span>
                                                <p className="text-sm font-bold text-white whitespace-pre-wrap">{session.notes || 'No notes for this session.'}</p>
                                            </div>
                                            {session.splits && Array.isArray(session.splits) && session.splits.length > 0 && (
                                                <div className="flex flex-col gap-2">
                                                    <h4 className="text-xs font-black uppercase tracking-widest text-[#A3A3A3] mb-2">Splits</h4>
                                                    {session.splits.map((split, sIdx) => {
                                                        const hasDuration = typeof split.duration === 'number' && !isNaN(split.duration);
                                                        const m = hasDuration ? Math.floor(split.duration / 60) : 0;
                                                        const s = hasDuration ? split.duration % 60 : 0;
                                                        const timeStr = hasDuration ? `${m}:${s < 10 ? '0' + s : s}` : null;
                                                        return (
                                                            <div key={sIdx} className="bg-[#171717]/50 border border-[#262626] p-3 rounded-xl flex justify-between items-center group hover:border-[#404040] transition-colors">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="w-6 h-6 rounded-full bg-[#0A0A0A] border border-[#262626] flex items-center justify-center text-[9px] font-black text-[#A3A3A3]">
                                                                        {sIdx + 1}
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className="text-xs font-bold text-white">{split.title}</span>
                                                                        {split.distance && <span className="text-[9px] font-bold text-[#A3A3A3] uppercase">{split.distance}</span>}
                                                                    </div>
                                                                </div>
                                                                {timeStr && (
                                                                    <span className="text-sm font-black text-brand-500 tabular-nums">
                                                                        {timeStr}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )
                                ) : (
                                    session.exercises.map((ex, idx) => (
                                        <div key={idx} className="flex flex-col gap-3">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full shadow-[0_0_8px_rgba(212,255,0,0.5)]" style={{ background: MUSCLE_GROUP_COLORS[ex.Target_Muscle] || '#D4FF00' }}></div>
                                                <span className="text-lg font-black text-white tracking-tight">{ex.Exercise}</span>
                                            </div>
                                            <div className="flex flex-wrap gap-2.5">
                                                {(ex.Reps || '').toString().split(',').filter(r => r.trim() !== '').map((rep, rIdx) => {
                                                    const weightMatch = ex.notes?.match(/\[\[W:([\d.,]+)\]\]/);
                                                    let displayKg = ex.Kg || 0;
                                                    if (weightMatch) {
                                                        const weights = weightMatch[1].split(',');
                                                        displayKg = weights[rIdx] || weights[weights.length - 1] || displayKg;
                                                    }
                                                    return (
                                                        <div key={rIdx} className="bg-[#171717] border border-[#262626] py-2 px-4 rounded-xl flex items-center gap-1.5 min-w-[80px] justify-center">
                                                            <span className="text-[10px] font-bold text-[#A3A3A3]">{rIdx + 1} ·</span>
                                                            <span className="text-sm font-black text-white">{parseFloat(displayKg).toFixed(2)}</span>
                                                            <span className="text-[10px] font-bold text-[#A3A3A3]">kg</span>
                                                            <span className="text-[10px] font-black text-[#A3A3A3]">×</span>
                                                            <span className="text-sm font-black text-white">{rep.trim()}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                ))}
                {filteredSessions.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
                            <Calendar className="w-10 h-10 text-white/20" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-1">No Activity</h3>
                        <p className="text-[#A3A3A3] text-sm">You haven't logged any sessions in this period.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
