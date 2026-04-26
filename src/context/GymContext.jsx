import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getUserGyms } from '../api';
import { useAuth } from './AuthContext';

const GymContext = createContext();

export function GymProvider({ children }) {
    const { user } = useAuth();
    const [activeGymId, setActiveGymIdState] = useState(null);
    const [activeGymName, setActiveGymName] = useState(null);
    const [activeGymIcon, setActiveGymIcon] = useState(null);
    const [gyms, setGyms] = useState([]);
    const [gymsLoaded, setGymsLoaded] = useState(false);

    // Load user's gyms and set the default one as active
    useEffect(() => {
        if (!user) return;

        const load = async () => {
            try {
                const data = await getUserGyms(user.id);
                setGyms(data);
                // Pick the default gym (or first available)
                const def = data.find(g => g.is_default) || data[0] || null;
                if (def) {
                    setActiveGymIdState(def.id);
                    setActiveGymName(def.name);
                    setActiveGymIcon(def.icon);
                }
            } catch (e) {
                console.warn('GymContext: failed to load gyms:', e?.message);
            } finally {
                setGymsLoaded(true);
            }
        };

        load();
    }, [user]);

    const setActiveGym = useCallback((gym) => {
        if (!gym) {
            setActiveGymIdState(null);
            setActiveGymName(null);
            setActiveGymIcon(null);
            return;
        }
        setActiveGymIdState(gym.id);
        setActiveGymName(gym.name);
        setActiveGymIcon(gym.icon);
    }, []);

    const refreshGyms = useCallback(async () => {
        if (!user) return;
        try {
            const data = await getUserGyms(user.id);
            setGyms(data);
            // If active gym was deleted, reset to default
            if (activeGymId && !data.find(g => g.id === activeGymId)) {
                const def = data.find(g => g.is_default) || data[0] || null;
                if (def) {
                    setActiveGymIdState(def.id);
                    setActiveGymName(def.name);
                    setActiveGymIcon(def.icon);
                } else {
                    setActiveGymIdState(null);
                    setActiveGymName(null);
                    setActiveGymIcon(null);
                }
            }
            return data;
        } catch (e) {
            console.warn('GymContext: failed to refresh gyms:', e?.message);
        }
    }, [user, activeGymId]);

    return (
        <GymContext.Provider value={{
            activeGymId,
            activeGymName,
            activeGymIcon,
            gyms,
            gymsLoaded,
            setActiveGym,
            refreshGyms,
        }}>
            {children}
        </GymContext.Provider>
    );
}

export function useGym() {
    return useContext(GymContext);
}
