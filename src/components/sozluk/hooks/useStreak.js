import { useState, useEffect, useMemo } from 'react';
import { db } from '../../../firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../../../context/AuthContext';

export const useStreak = () => {
    const { user } = useAuth();
    const [dailyStats, setDailyStats] = useState({});

    useEffect(() => {
        if (!user) return;
        
        const unsub = onSnapshot(collection(db, `users/${user.uid}/daily_stats`), (snapshot) => {
            const stats = {};
            snapshot.forEach(doc => {
                stats[doc.id] = doc.data();
            });
            setDailyStats(stats);
        }, (err) => {
            console.error("Error fetching daily stats for streak:", err);
        });

        return () => unsub();
    }, [user]);

    const getLocalDateStr = (d) => {
        const tzOffset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - tzOffset).toISOString().split('T')[0];
    };

    const todayStr = getLocalDateStr(new Date());
    const todayDoc = dailyStats[todayStr] || {};
    const todayProgress = typeof todayDoc === 'number' ? todayDoc : (todayDoc.correctCount || 0);
    const isGoalReached = todayProgress >= 100;
    const remaining = Math.max(0, 100 - todayProgress);

    const streakCount = useMemo(() => {
        let streak = 0;
        let d = new Date();

        // Check today first
        const tdDoc = dailyStats[getLocalDateStr(d)] || {};
        const tdCount = typeof tdDoc === 'number' ? tdDoc : (tdDoc.correctCount || 0);
        if (tdCount >= 100) {
            streak++;
        }

        // Go backwards from yesterday
        d.setDate(d.getDate() - 1);
        while (true) {
            const dateStr = getLocalDateStr(d);
            const pastDoc = dailyStats[dateStr] || {};
            const pastCount = typeof pastDoc === 'number' ? pastDoc : (pastDoc.correctCount || 0);
            if (pastCount >= 100) {
                streak++;
                d.setDate(d.getDate() - 1);
            } else {
                break;
            }
        }
        return streak;
    }, [dailyStats]);

    return { streakCount, isGoalReached, remaining, dailyStats, todayProgress, todayStr };
};
