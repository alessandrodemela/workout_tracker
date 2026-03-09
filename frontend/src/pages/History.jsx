import React from 'react';
import useSWR from 'swr';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const fetcher = (url) => fetch(url).then((res) => res.json());

function History() {
    const { data: history, error, isValidating } = useSWR(`${API_URL}/workout-history`, fetcher, {
        revalidateOnFocus: true,
        dedupingInterval: 5000,
    });

    if (error) return (
        <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
            <span className="text-red-500 font-medium text-center">Connection error.</span>
            <button onClick={() => window.location.reload()} className="text-zinc-500 underline text-sm">Retry</button>
        </div>
    );

    if (!history) return (
        <div className="flex flex-col gap-8">
            <div className="animate-pulse">
                <div className="h-10 w-32 bg-zinc-900 rounded-lg mb-2"></div>
                <div className="h-4 w-48 bg-zinc-900 rounded-lg"></div>
            </div>
            <div className="flex flex-col gap-6">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-32 w-full bg-zinc-900/50 rounded-[2rem] animate-pulse"></div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="flex flex-col gap-10 pb-32">
            <div className="flex flex-col gap-1 mt-4">
                <div className="flex justify-between items-center">
                    <h1 className="text-4xl font-extrabold tracking-tight">Timeline</h1>
                    {isValidating && (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-900 rounded-full border border-zinc-800">
                            <div className="w-1 h-1 rounded-full bg-red-500 animate-ping"></div>
                            <span className="text-[8px] font-black uppercase tracking-widest text-zinc-500">Live</span>
                        </div>
                    )}
                </div>
                <p className="text-zinc-500 font-medium">Your activity across training blocks.</p>
            </div>

            {/* Standard Workouts */}
            {history.workouts && history.workouts.length > 0 && (
                <div className="flex flex-col gap-6">
                    {history.workouts.slice().reverse().slice(0, 15).map((log, i) => (
                        <div key={i} className="relative group">
                            <div className="flex flex-col gap-4 p-6 bg-zinc-900/20 border border-zinc-900/50 rounded-[2rem] active:scale-[0.99] transition-all">
                                <div className="flex justify-between items-center border-b border-zinc-900/50 pb-3">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">{log.Date}</span>
                                        <span className="text-xs font-bold text-red-500">{log.Session_Type}</span>
                                    </div>
                                    <div className="text-[10px] bg-zinc-900 px-3 py-1 rounded-full font-bold text-zinc-500">#{history.workouts.length - i}</div>
                                </div>

                                <div className="flex flex-col gap-1">
                                    <h3 className="text-lg font-bold text-white leading-tight">{log.Exercise}</h3>
                                    <div className="flex items-center gap-3 mt-1">
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-xl font-black text-white">{log.Kg}</span>
                                            <span className="text-[10px] font-bold text-zinc-600 uppercase">KG</span>
                                        </div>
                                        <span className="h-4 w-[1px] bg-zinc-800"></span>
                                        <div className="flex items-center gap-1.5 text-zinc-400 font-medium text-sm">
                                            <span className="text-white font-bold">{log.Sets}</span>
                                            <span className="text-[10px] opacity-40">SETS</span>
                                            <span className="mx-1 opacity-20">×</span>
                                            <span className="text-white font-bold">{log.Reps}</span>
                                            <span className="text-[10px] opacity-40">REPS</span>
                                        </div>
                                    </div>
                                </div>

                                {log.RPE && (
                                    <div className="inline-flex self-start px-2 py-0.5 bg-zinc-900/80 rounded text-[9px] font-black tracking-widest text-zinc-500 uppercase border border-zinc-800">
                                        RPE {log.RPE}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Functional Logs */}
            {history.functional && history.functional.length > 0 && (
                <div className="flex flex-col gap-6">
                    <h2 className="text-sm font-black uppercase tracking-[0.3em] text-zinc-700 ml-1 border-b border-zinc-900 pb-2 mt-4">
                        Conditioning
                    </h2>
                    {history.functional.slice().reverse().slice(0, 10).map((log, i) => (
                        <div key={i} className="p-6 bg-zinc-900/10 border border-zinc-900/30 rounded-[2rem] border-l-2 border-l-red-500/20">
                            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600 block mb-3">{log.Date}</span>
                            <p className="text-zinc-400 text-sm font-medium leading-relaxed whitespace-pre-wrap">{log.Notes}</p>
                        </div>
                    ))}
                </div>
            )}

            {(!history.workouts?.length && !history.functional?.length) && (
                <div className="flex flex-col items-center justify-center p-20 text-center opacity-30">
                    <span className="text-4xl mb-4">💤</span>
                    <p className="text-sm font-medium">No activity recorded yet.</p>
                </div>
            )}
        </div>
    );
}

export default History;
