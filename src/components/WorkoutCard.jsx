import React from 'react';

export default function WorkoutCard({ log, index, total }) {
    return (
        <div className="card-glass group hover:border-[#262626] transition-all duration-300">
            <div className="flex justify-between items-center border-b border-[#171717] pb-3 mb-3">
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-widest text-[#A3A3A3]">{log.Date}</span>
                    <span className="text-xs font-bold text-brand-500">{log.Session_Type}</span>
                </div>
                <div className="text-[10px] bg-[#171717] px-3 py-1 rounded-full font-bold text-[#FAFAFA]">#{total - index}</div>
            </div>

            <div className="flex flex-col gap-1">
                <h3 className="text-base font-bold text-white leading-tight">{log.Exercise}</h3>
                <div className="flex items-center gap-3 mt-1">
                    <div className="flex items-baseline gap-1">
                        <span className="text-xl font-black text-white">{parseFloat(log.Kg || 0).toFixed(2)}</span>
                        <span className="text-[10px] font-bold text-[#A3A3A3] uppercase">KG</span>
                    </div>
                    <span className="h-4 w-[1px] bg-[#262626]"></span>
                    <div className="flex items-center gap-1.5 text-[#A3A3A3] font-medium text-sm">
                        <span className="text-white font-bold">{log.Sets}</span>
                        <span className="text-[10px] opacity-60">SETS</span>
                        <span className="mx-1 opacity-40">×</span>
                        <span className="text-white font-bold">{log.Reps}</span>
                        <span className="text-[10px] opacity-60">REPS</span>
                    </div>
                </div>
            </div>

            {log.RPE && (
                <div className="inline-flex self-start mt-3 px-2 py-0.5 bg-[#171717] rounded text-[9px] font-black tracking-widest text-[#A3A3A3] uppercase border border-[#262626]">
                    RPE {log.RPE}
                </div>
            )}
        </div>
    );
}
