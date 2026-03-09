import React, { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const MUSCLE_TO_AREA_MAP = {
    'Chest': 'Upper Body',
    'Back': 'Upper Body',
    'Shoulders': 'Upper Body',
    'Biceps': 'Upper Body',
    'Triceps': 'Upper Body',
    'Quadriceps': 'Lower Body',
    'Hamstrings': 'Lower Body',
    'Calves': 'Lower Body',
    'Glutes': 'Lower Body',
    'Core': 'Core',
    'Full Body': 'Full Body',
    'Other': 'Other'
};

function AddExercise() {
    const [formData, setFormData] = useState({
        Exercise_Name: '',
        Target_Muscle: '',
        Target_Area: '',
        Equipment: '',
        Notes: ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        let newFormData = { ...formData, [name]: value };

        if (name === 'Target_Muscle' && value) {
            newFormData.Target_Area = MUSCLE_TO_AREA_MAP[value] || '';
        }

        setFormData(newFormData);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.Exercise_Name) return alert('Exercise Name is required');

        setIsSaving(true);
        setSaveSuccess(false);

        try {
            const res = await fetch(`${API_URL}/exercises`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                setSaveSuccess(true);
                setFormData({ Exercise_Name: '', Target_Muscle: '', Target_Area: '', Equipment: '', Notes: '' });
                setTimeout(() => setSaveSuccess(false), 2000);
            } else {
                alert('Failed to add exercise');
            }
        } catch (err) {
            console.error(err);
            alert('Error saving exercise');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-col gap-8 pb-32">
            <div>
                <h1 className="text-4xl font-extrabold tracking-tight mb-2">Manage</h1>
                <p className="text-zinc-500 font-medium">Add new movements to your repertoire.</p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                <div className="flex flex-col gap-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 ml-1">Movement Name</label>
                    <input
                        className="input-field"
                        name="Exercise_Name" value={formData.Exercise_Name} onChange={handleChange} required
                        placeholder="e.g. Incline DB Press"
                    />
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-2">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 ml-1">Muscle</label>
                        <select
                            className="input-field appearance-none"
                            name="Target_Muscle" value={formData.Target_Muscle} onChange={handleChange}
                        >
                            <option value="">Select...</option>
                            {Object.keys(MUSCLE_TO_AREA_MAP).map(muscle => (
                                <option key={muscle} value={muscle}>{muscle}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex flex-col gap-2 opacity-50">
                        <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 ml-1">Area (Auto)</label>
                        <input
                            className="input-field cursor-not-allowed"
                            name="Target_Area" value={formData.Target_Area} readOnly
                            placeholder="---"
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 ml-1">Equipment</label>
                    <select
                        className="input-field appearance-none"
                        name="Equipment" value={formData.Equipment} onChange={handleChange}
                    >
                        <option value="">Select...</option>
                        <option value="Barbell">Barbell</option>
                        <option value="Dumbbell">Dumbbell</option>
                        <option value="Machine">Machine</option>
                        <option value="Cable">Cable</option>
                        <option value="Bodyweight">Bodyweight</option>
                        <option value="Other">Other</option>
                    </select>
                </div>

                <div className="flex flex-col gap-2">
                    <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 ml-1">Technical Notes</label>
                    <textarea
                        className="input-field min-h-[120px]"
                        name="Notes" value={formData.Notes} onChange={handleChange}
                        placeholder="Cues, seat height, etc."
                    />
                </div>

                <button
                    type="submit"
                    disabled={isSaving}
                    className="btn-primary mt-4"
                >
                    {isSaving ? 'Registering...' : saveSuccess ? '✅ Registered' : 'Register Exercise'}
                </button>
            </form>
        </div>
    );
}

export default AddExercise;
