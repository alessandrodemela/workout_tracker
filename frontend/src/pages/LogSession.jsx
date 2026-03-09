import React, { useState, useEffect } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function LogSession() {
    const [sessionType, setSessionType] = useState('A (Standard Gym)');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [exercisesData, setExercisesData] = useState([]);
    const [globalNotes, setGlobalNotes] = useState('');
    const [rows, setRows] = useState([{ ex: '', kg: 0, sets: '', reps: '', rpe: 8 }]);

    // Functional specific
    const [functionalNotes, setFunctionalNotes] = useState('');

    // Save status
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    useEffect(() => {
        fetch(`${API_URL}/exercises`)
            .then(res => res.json())
            .then(data => {
                if (data.exercises) {
                    setExercisesData(data.exercises);
                    if (data.exercises.length > 0) {
                        setRows([{ ex: data.exercises[0], kg: 0, sets: '', reps: '', rpe: 8 }]);
                    }
                }
            })
            .catch(err => console.error("Error fetching exercises:", err));
    }, []);

    const handleAddRow = () => {
        setRows([...rows, { ex: exercisesData[0] || '', kg: 0, sets: '', reps: '', rpe: 8 }]);
    };

    const handleRowChange = (index, field, value) => {
        const updated = [...rows];
        updated[index][field] = value;
        setRows(updated);
    };

    const handleRemoveRow = (index) => {
        if (rows.length > 1) {
            setRows(rows.filter((_, i) => i !== index));
        }
    };

    const submitFunctional = async () => {
        if (!functionalNotes) return alert('Enter functional notes!');

        setIsSaving(true);
        setSaveSuccess(false);

        const payload = {
            Date: date,
            Session_Type: sessionType,
            Notes: functionalNotes
        };

        try {
            const res = await fetch(`${API_URL}/functional-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setSaveSuccess(true);
                setFunctionalNotes('');
                setTimeout(() => setSaveSuccess(false), 2000);
            } else {
                alert('Failed to save');
            }
        } catch (err) {
            console.error(err);
            alert('Error saving session');
        } finally {
            setIsSaving(false);
        }
    };

    const submitStandard = async () => {
        // validate
        if (rows.some(r => !r.ex || !r.sets || !r.reps)) {
            return alert('Fill exercise, sets, and reps for all rows');
        }

        setIsSaving(true);
        setSaveSuccess(false);

        const payload = {
            Date: date,
            Session_Type: sessionType,
            Notes: globalNotes,
            Exercises: rows.map(r => ({
                Exercise: r.ex,
                Kg: parseFloat(r.kg),
                Sets: r.sets,
                Reps: String(r.reps),
                RPE: parseInt(r.rpe)
            }))
        };

        try {
            const res = await fetch(`${API_URL}/workout-session`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setSaveSuccess(true);
                setRows([{ ex: exercisesData[0] || '', kg: 0, sets: '', reps: '', rpe: 8 }]);
                setGlobalNotes('');
                setTimeout(() => setSaveSuccess(false), 2000);
            } else {
                alert('Failed to save');
            }
        } catch (err) {
            console.error(err);
            alert('Error saving session');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col gap-8 pb-32">
            <div className="mt-4">
                <h1 className="text-4xl font-extrabold tracking-tight mb-2">Workout</h1>
                <p className="text-zinc-500 font-medium">Log your progress and stay consistent.</p>
            </div>

            <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 ml-1">Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="input-field !py-3"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 ml-1">Type</label>
                        <select
                            value={sessionType}
                            onChange={e => setSessionType(e.target.value)}
                            className="input-field !py-3 appearance-none"
                        >
                            <option value="A (Standard Gym)">A (Gym)</option>
                            <option value="B (Office Gym)">B (Office)</option>
                            <option value="Functional">Functional</option>
                        </select>
                    </div>
                </div>
            </div>

            {sessionType === 'Functional' ? (
                <div className="flex flex-col gap-4">
                    <textarea
                        className="input-field min-h-[200px]"
                        placeholder="Circuit details..."
                        value={functionalNotes}
                        onChange={e => setFunctionalNotes(e.target.value)}
                    />
                    <button
                        onClick={submitFunctional}
                        disabled={isSaving}
                        className="btn-primary"
                    >
                        {isSaving ? 'Saving...' : saveSuccess ? '✅ Saved' : 'Save Session'}
                    </button>
                </div>
            ) : (
                <div className="flex flex-col gap-6">
                    {rows.map((row, index) => (
                        <div key={index} className="flex flex-col gap-4 p-5 bg-zinc-900/40 rounded-[2rem] border border-zinc-900/50">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500 bg-red-500/10 px-3 py-1 rounded-full">Set #{index + 1}</span>
                                <button
                                    className="text-zinc-600 hover:text-red-500 transition-colors p-1"
                                    onClick={() => handleRemoveRow(index)}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 ml-1">Exercise</label>
                                <select
                                    value={row.ex}
                                    onChange={e => handleRowChange(index, 'ex', e.target.value)}
                                    className="input-field !py-3 appearance-none bg-zinc-900"
                                >
                                    {exercisesData.map(ex => (
                                        <option key={ex} value={ex}>{ex}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-4 gap-2">
                                <div className="col-span-1 flex flex-col gap-1.5">
                                    <label className="text-[9px] uppercase tracking-widest font-black text-center text-zinc-600">KG</label>
                                    <input
                                        type="number" step="0.5"
                                        value={row.kg}
                                        onChange={e => handleRowChange(index, 'kg', e.target.value)}
                                        className="input-field !px-1 !py-3 text-center text-sm font-bold"
                                    />
                                </div>
                                <div className="col-span-1 flex flex-col gap-1.5">
                                    <label className="text-[9px] uppercase tracking-widest font-black text-center text-zinc-600">Sets</label>
                                    <input
                                        type="text" inputMode="numeric"
                                        value={row.sets}
                                        onChange={e => handleRowChange(index, 'sets', e.target.value)}
                                        className="input-field !px-1 !py-3 text-center text-sm font-bold"
                                        placeholder="3"
                                    />
                                </div>
                                <div className="col-span-1 flex flex-col gap-1.5">
                                    <label className="text-[9px] uppercase tracking-widest font-black text-center text-zinc-600">Reps</label>
                                    <input
                                        type="text" inputMode="numeric"
                                        value={row.reps}
                                        onChange={e => handleRowChange(index, 'reps', e.target.value)}
                                        className="input-field !px-1 !py-3 text-center text-sm font-bold"
                                        placeholder="10"
                                    />
                                </div>
                                <div className="col-span-1 flex flex-col gap-1.5">
                                    <label className="text-[9px] uppercase tracking-widest font-black text-center text-zinc-600">RPE</label>
                                    <input
                                        type="number" min="1" max="10" step="0.5"
                                        value={row.rpe}
                                        onChange={e => handleRowChange(index, 'rpe', e.target.value)}
                                        className="input-field !px-1 !py-3 text-center text-sm font-bold text-red-500"
                                    />
                                </div>
                            </div>
                        </div>
                    ))}

                    <button
                        className="w-full py-6 rounded-[2rem] border-2 border-dashed border-zinc-900 text-zinc-500 font-bold hover:text-white hover:border-zinc-800 transition-all active:scale-95 group"
                        onClick={handleAddRow}
                    >
                        <span className="flex items-center justify-center gap-2">
                            <span className="text-xl group-hover:scale-125 transition-transform">+</span> Add Exercise
                        </span>
                    </button>

                    <div className="bg-zinc-900/20 rounded-[2rem] p-6 border border-zinc-900/50 mt-4">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-3 block ml-1">Global Notes</label>
                        <textarea
                            className="w-full bg-transparent border-none p-0 text-white focus:ring-0 placeholder:text-zinc-700 resize-none min-h-[80px]"
                            placeholder="How are you feeling today?"
                            value={globalNotes}
                            onChange={e => setGlobalNotes(e.target.value)}
                        />
                    </div>

                    <div className="fixed bottom-24 left-6 right-6 z-40 max-w-lg mx-auto">
                        <button
                            onClick={submitStandard}
                            disabled={isSaving}
                            className={`btn-primary shadow-2xl shadow-red-600/20 py-5 text-lg font-black tracking-widest uppercase ${isSaving ? 'opacity-50' : ''}`}
                        >
                            {isSaving ? 'Uploading...' : saveSuccess ? '✅ Done' : 'Complete Session'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default LogSession;
