import React, { useState } from 'react';
import { ChevronLeft, Download, Timer, Dumbbell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';
import { API_URL, fetcher } from '../api';

export default function Settings() {
    const navigate = useNavigate();
    
    // Default Rest Timer. 0 means disabled (ask user).
    const [defaultRest, setDefaultRest] = useState(
        parseInt(localStorage.getItem('defaultRestTimer') || '0')
    );

    const handleRestChange = (val) => {
        setDefaultRest(val);
        localStorage.setItem('defaultRestTimer', val.toString());
    };

    // Export Workouts
    const { data: historyData } = useSWR(`${API_URL}/workout-history`, fetcher);

    const handleExportCSV = () => {
        if (!historyData || !historyData.workouts) {
            alert('No workout data available to export.');
            return;
        }

        const workouts = historyData.workouts;
        if (workouts.length === 0) {
            alert('No workouts to export.');
            return;
        }

        // CSV Header
        let csvContent = "data:text/csv;charset=utf-8,";
        csvContent += "Date,Session_Type,Exercise,Kg,Sets,Reps,RPE,Notes\n";

        workouts.forEach(w => {
            const row = [
                w.Date, 
                w.Session_Type, 
                `"${w.Exercise || ''}"`, 
                w.Kg || '', 
                w.Sets || '', 
                `"${w.Reps ? w.Reps.replace(/"/g, '""') : ''}"`, 
                w.RPE || '', 
                `"${w.Notes ? w.Notes.replace(/"/g, '""') : ''}"`
            ].join(",");
            csvContent += row + "\n";
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `workout_history_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col gap-8 pb-32 pt-6 animate-fade-in w-full">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/home')} className="w-10 h-10 rounded-full bg-[#171717] flex items-center justify-center text-[#A3A3A3] hover:text-white transition-colors">
                    <ChevronLeft className="w-6 h-6" />
                </button>
                <div className="flex flex-col">
                    <h1 className="text-3xl font-black tracking-tight text-white">Settings</h1>
                </div>
            </div>

            <div className="flex flex-col gap-6">
                
                {/* Timer Section */}
                <div className="flex flex-col gap-3">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Timer className="w-5 h-5 text-brand-500" /> Defaults
                    </h2>
                    <div className="card-glass border-[#171717] p-4 flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                            <div className="flex flex-col">
                                <span className="font-bold text-white">Auto Rest Timer</span>
                                <span className="text-xs text-[#A3A3A3]">Auto starts when set is completed (0 to ask)</span>
                            </div>
                            <div className="flex items-center gap-2 w-28">
                                <input 
                                    type="number"
                                    className="bg-[#171717] text-white w-full text-center py-2 rounded-xl focus:outline-none focus:border-brand-500 border border-[#262626]"
                                    value={defaultRest}
                                    onChange={(e) => handleRestChange(parseInt(e.target.value) || 0)}
                                    min="0"
                                    step="10"
                                />
                                <span className="text-xs font-bold text-[#A3A3A3]">s</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Data Export Section */}
                <div className="flex flex-col gap-3">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Dumbbell className="w-5 h-5 text-brand-500" /> Data Management
                    </h2>
                    <div className="card-glass border-[#171717] p-4 flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                            <div className="flex flex-col flex-1">
                                <span className="font-bold text-white">Export Workouts</span>
                                <span className="text-xs text-[#A3A3A3]">Download your complete history as CSV</span>
                            </div>
                            <button 
                                onClick={handleExportCSV}
                                className="w-12 h-12 rounded-2xl bg-[#171717] text-[#404040] flex items-center justify-center hover:text-brand-500 hover:border-brand-500 transition-all border border-transparent"
                            >
                                <Download className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
