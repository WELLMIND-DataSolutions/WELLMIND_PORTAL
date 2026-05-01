import React, { useState, useEffect } from 'react';
import Sidebar from '../Sidebar';
import { db } from "../firebase"; 
import {  collection, onSnapshot, query, where } from "firebase/firestore";



// ─── WellMind Brand Palette ───
const Brand = {
    PrimaryPurple: "#623068",
    PrimaryDark: "#331B3F",
    PrimaryMid: "#47234F",
    SecondaryRed: "#8A1C37",
    ActionTeal: "#0D7289",
    AccentGold: "#C0854A",
    MainBG: "#F5F0E5",
    DarkBG: "#1A1228",
    TextMain: "#2D1B38",
    TextLight: "#F0EAF8",
};

// ─── Intern Tier System (Themed) ───
const getInternTier = (totalProjects=0) => {
    if (totalProjects >= 21) return {
        label: 'Promoted to Employee',
        emoji: '🚀',
        color: Brand.PrimaryPurple,
        bg: `linear-gradient(135deg, ${Brand.PrimaryPurple}, ${Brand.PrimaryMid})`,
        badge: Brand.TextLight,
        badgeText: Brand.PrimaryPurple,
        next: null,
        progress: 100,
    };
    if (totalProjects >= 11) return {
        label: 'Stipend Earned',
        emoji: '💰',
        color: Brand.ActionTeal,
        bg: `linear-gradient(135deg, ${Brand.ActionTeal}, #14b8a6)`,
        badge: '#e0f2f1',
        badgeText: Brand.ActionTeal,
        next: 21,
        nextLabel: 'Promoted to Employee',
        progress: Math.round(((totalProjects - 11) / 10) * 100),
    };
    return {
        label: 'Intern',
        emoji: '🌱',
        color: Brand.AccentGold,
        bg: `linear-gradient(135deg, ${Brand.AccentGold}, #d97706)`,
        badge: '#fffbeb',
        badgeText: Brand.AccentGold,
        next: 11,
        nextLabel: 'Stipend Earned',
        progress: Math.round((totalProjects / 10) * 100),
    };
};

// ─── Employee Rank System (Themed) ───
const getEmployeeRank = (points=0) => {
    if (points >= 300) return { label: 'Legend',    emoji: '👑', color: Brand.SecondaryRed,  bg: `linear-gradient(135deg, ${Brand.SecondaryRed}, #ef4444)`, badge: '#fee2e2', badgeText: Brand.SecondaryRed };
    if (points >= 200) return { label: 'Elite',     emoji: '💎', color: Brand.PrimaryPurple, bg: `linear-gradient(135deg, ${Brand.PrimaryPurple}, ${Brand.PrimaryMid})`, badge: Brand.TextLight, badgeText: Brand.PrimaryPurple };
    if (points >= 120) return { label: 'Senior',    emoji: '⭐', color: Brand.ActionTeal,    bg: `linear-gradient(135deg, ${Brand.ActionTeal}, #0ea5e9)`, badge: '#e0f2fe', badgeText: Brand.ActionTeal };
    if (points >= 60)  return { label: 'Mid-Level', emoji: '🔥', color: Brand.AccentGold,    bg: `linear-gradient(135deg, ${Brand.AccentGold}, #f59e0b)`, badge: '#fef3c7', badgeText: Brand.AccentGold };
    return              { label: 'Junior',       emoji: '🌟', color: Brand.PrimaryMid,    bg: `linear-gradient(135deg, ${Brand.PrimaryMid}, ${Brand.PrimaryDark})`, badge: '#ece6f0', badgeText: Brand.PrimaryMid };
};

// ─── Progress Bar ───
const ProgressBar = ({ percent, color }) => (
    <div style={{ background: '#e2e8f0', borderRadius: 99, height: 6, overflow: 'hidden', marginTop: 6 }}>
        <div style={{ width: `${Math.min(percent, 100)}%`, height: '100%', borderRadius: 99, background: color, transition: 'width 0.6s ease' }} />
    </div>
);

// ─── Podium Card ───
const PodiumCard = ({ data, color, emoji, size, tab }) => {
    if (!data) return null; // CRASH PREVENTED
    const tier = tab === 'interns' ? getInternTier(data.totalProjects) : getEmployeeRank(data.points);
    return (
        <div style={{
            width: 170, backgroundColor: 'white', borderRadius: '16px 16px 6px 6px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'flex-end', padding: '16px 10px 14px',
            height: size, borderTop: `5px solid ${color}`, position: 'relative'
        }}>
            <div style={{ fontSize: 28, position: 'absolute', top: 10 }}>{emoji}</div>
            <div style={{
                width: 52, height: 52, borderRadius: '50%', background: tier.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 900, fontSize: 20, marginBottom: 8,
                boxShadow: `0 4px 12px ${tier.color}44`
            }}>{data.avatar}</div>
            <div style={{ fontWeight: 800, fontSize: 13, color: Brand.TextMain, textAlign: 'center', marginBottom: 4 }}>{data.name}</div>
            <div style={{ fontSize: 11, background: tier.badge, color: tier.badgeText, padding: '3px 10px', borderRadius: 20, fontWeight: 700, marginBottom: 4 }}>
                {tier.emoji} {tier.label}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                {tab === 'interns' ? `${data.totalProjects} Projects` : `${data.points} pts`}
            </div>
        </div>
    );
};

const Achievements = ({ onNavigate }) => {
    const [loading, setLoading]     = useState(true);
    const [activeTab, setActiveTab] = useState('employees');
    const [leaderboard, setLeaderboard] = useState([]);

   useEffect(() => {
    let isMounted = true; // 🔴 HIGHLIGHT: Memory leak aur crash se bachne ke liye
    setLoading(true);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const q = query(collection(db, "projects"), where("status", "==", "completed"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        if (!isMounted) return; // 🔴 HIGHLIGHT: Agar component unmount ho gaya ho to agay na barhein

        try {
            const projects = snapshot.docs.map(doc => doc.data());

            const stats = projects.reduce((acc, proj) => {
                const type = proj.personType === 'employees' || proj.personType === 'employee' ? 'employees' : 'interns';
                if (type !== activeTab) return acc;

                // 🔴 HIGHLIGHT: ID aur Name ke liye safety check (agar data missing ho)
                const id = proj.personId || proj.personName || "unknown";
                if (!acc[id]) {
                    acc[id] = {
                        name: proj.personName || "Unknown",
                        projectsDone: 0,
                        totalProjects: 0,
                        onTime: 0,
                        points: 0,
                        lastCompletion: 0,
                        // 🔴 HIGHLIGHT: charAt se pehle check karein ke name null to nahi
                        avatar: proj.personName ? proj.personName.charAt(0).toUpperCase() : "?"
                    };
                }

                acc[id].totalProjects += 1;
                const isThisMonth = proj.completedAt && proj.completedAt >= startOfMonth;
                
                if (isThisMonth) {
                    acc[id].projectsDone += 1;
                    const compDate = new Date(proj.completedAt);
                    const deadDate = new Date(proj.deadline);
                    
                    // 🔴 HIGHLIGHT: compDate aur deadDate valid hain ya nahi, check karein
                    if (!isNaN(compDate) && !isNaN(deadDate)) {
                        if (compDate <= deadDate) {
                            acc[id].onTime += 1;
                            acc[id].points += 15;
                        } else {
                            acc[id].points += 5;
                        }
                        if (compDate.getTime() > acc[id].lastCompletion) {
                            acc[id].lastCompletion = compDate.getTime();
                        }
                    }
                }
                return acc;
            }, {});

            const sortedArray = Object.values(stats).sort((a, b) => {
                if (b.points !== a.points) return b.points - a.points;
                if (b.onTime !== a.onTime) return b.onTime - a.onTime;
                return a.lastCompletion - b.lastCompletion;
            });

            setLeaderboard(sortedArray.map((item, index) => ({ ...item, rank: index + 1 })));
            setLoading(false);

        } catch (error) {
            // 🔴 HIGHLIGHT: Agar calculations mein error aaye to crash na ho
            console.error("Data processing error:", error);
            setLoading(false);
        }
    }, (err) => {
        // 🔴 HIGHLIGHT: Firebase ka error callback add kiya
        console.error("Firebase error:", err);
        if (isMounted) setLoading(false);
    });

    return () => {
        isMounted = false; 
        unsubscribe();    
    };
}, [activeTab]);
    const top3 = leaderboard.slice(0, 3);
    const rest = leaderboard.slice(3);

    const podiumOrder = [
        top3[1] ? { data: top3[1], color: '#94a3b8', emoji: '🥈', size: 150 } : null,
        top3[0] ? { data: top3[0], color: Brand.AccentGold, emoji: '🥇', size: 190 } : null,
        top3[2] ? { data: top3[2], color: '#cd7f32', emoji: '🥉', size: 135 } : null,
    ].filter(Boolean);

    return (
        <div style={{ display: 'flex', backgroundColor: Brand.MainBG, minHeight: '100vh' }}>
            <div style={{ width: 260, flexShrink: 0 }}>
             <Sidebar onNavigate={onNavigate} activeNav="achievements" />
            </div>

            <div style={{ flex: 1, padding: '40px', fontFamily: "'Segoe UI', system-ui, sans-serif", overflowX: 'auto' }}>

                {/* Header */}
                <div style={{ marginBottom: 28 }}>
                    <h1 style={{ margin: 0, color: Brand.TextMain, fontSize: 26, fontWeight: 900 }}>🏆 Monthly Leaderboard</h1>
                    <p style={{ color: Brand.PrimaryMid, margin: '4px 0 0', fontSize: 14, fontWeight: 500 }}>Ranking based on speed, quality & completion</p>
                </div>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 32 }}>
                    {['employees', 'interns'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            style={{
                                padding: '10px 24px', border: 'none', borderRadius: 10, cursor: 'pointer',
                                fontWeight: 700, fontSize: 14, transition: 'all 0.2s',
                                background: activeTab === tab ? Brand.PrimaryPurple : '#e2e8f0',
                                color: activeTab === tab ? Brand.TextLight : Brand.PrimaryMid,
                                boxShadow: activeTab === tab ? `0 4px 12px ${Brand.PrimaryPurple}44` : 'none'
                            }}
                        >
                            {tab === 'employees' ? '👔 Employees' : '🌱 Interns'}
                        </button>
                    ))}
                </div>

                {/* Legends */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 28, flexWrap: 'wrap' }}>
                    {(activeTab === 'interns' ? [
                        { label: 'Intern', emoji: '🌱', range: '1–10 Projects', color: Brand.AccentGold, bg: '#fffbeb' },
                        { label: 'Stipend Earned', emoji: '💰', range: '11–20 Projects', color: Brand.ActionTeal, bg: '#e0f2f1' },
                        { label: 'Promoted', emoji: '🚀', range: '21+ Projects', color: Brand.PrimaryPurple, bg: Brand.TextLight },
                    ] : [
                        { label: 'Junior', emoji: '🌟', pts: '0–59', color: Brand.PrimaryMid, bg: '#ece6f0' },
                        { label: 'Mid-Level', emoji: '🔥', pts: '60–119', color: Brand.AccentGold, bg: '#fef3c7' },
                        { label: 'Senior', emoji: '⭐', pts: '120–199', color: Brand.ActionTeal, bg: '#e0f2fe' },
                        { label: 'Elite', emoji: '💎', pts: '200–299', color: Brand.PrimaryPurple, bg: Brand.TextLight },
                        { label: 'Pro', emoji: '👑', pts: '300+', color: Brand.SecondaryRed, bg: '#fee2e2' },
                    ]).map(t => (
                        <div key={t.label} style={{ background: '#fff', borderRadius: 10, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                            <span style={{ fontSize: 18 }}>{t.emoji}</span>
                            <div>
                                <div style={{ fontWeight: 800, fontSize: 12, color: t.color }}>{t.label}</div>
                                <div style={{ fontSize: 10, color: '#94a3b8' }}>{t.pts || t.range}</div>
                            </div>
                        </div>
                    ))}
                </div>

                {loading ? (
                    <div style={{ padding: 60, textAlign: 'center', color: Brand.PrimaryPurple, fontWeight: 700, fontSize: 16 }}>Updating Scores...</div>
                ) : leaderboard.length === 0 ? (
                    <div style={{ padding: 60, textAlign: 'center', color: Brand.PrimaryMid, fontSize: 15 }}>No completed projects this month yet.</div>
                ) : (
                    <>
                        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 20, marginBottom: 40 }}>
                            {podiumOrder.map(({ data, color, emoji, size }) => (
                                <PodiumCard key={data.name} data={data} color={color} emoji={emoji} size={size} tab={activeTab} />
                            ))}
                        </div>

                        {rest.length > 0 && (
                            <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                                <div style={{ padding: '14px 22px', borderBottom: '1px solid #f1f5f9', fontWeight: 800, color: Brand.TextMain, fontSize: 14 }}>
                                    Other Rankings
                                </div>
                                {rest.map((user,i) => {
                                    if (!user) return null;
                                    const tier = activeTab === 'interns' ? getInternTier(user.totalProjects) : getEmployeeRank(user.points);
                                    
                                    return (
                                        <div key={user.name} style={{ display: 'flex', alignItems: 'center', padding: '14px 22px', borderBottom: `1px solid ${Brand.MainBG}`, gap: 14 }}>
                                            <span style={{ width: 32, fontWeight: 800, color: '#94a3b8', fontSize: 15 }}>#{user.rank}</span>
                                            <div style={{
                                                width: 40, height: 40, borderRadius: '50%', background: tier.bg,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: '#fff', fontWeight: 900, fontSize: 16, flexShrink: 0
                                            }}>{user.avatar}</div>

                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontWeight: 700, color: Brand.TextMain, fontSize: 14 }}>{user.name}</div>
                                                <span style={{ fontSize: 11, background: tier.badge, color: tier.badgeText, padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>
                                                    {tier.emoji} {tier.label}
                                                </span>
                                            </div>

                                            <div style={{ textAlign: 'center', minWidth: 60 }}>
                                                <div style={{ fontWeight: 800, fontSize: 16, color: Brand.TextMain }}>{user.projectsDone}</div>
                                                <div style={{ fontSize: 10, color: '#94a3b8' }}>This Month</div>
                                            </div>

                                            <div style={{ textAlign: 'center', minWidth: 60 }}>
                                                <div style={{ fontWeight: 800, fontSize: 16, color: Brand.ActionTeal }}>{user.onTime}</div>
                                                <div style={{ fontSize: 10, color: '#94a3b8' }}>On-Time</div>
                                            </div>

                                            <div style={{ background: Brand.TextLight, color: Brand.PrimaryPurple, padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 800, minWidth: 70, textAlign: 'center' }}>
                                                {user.points} pts
                                            </div>

                                            {activeTab === 'interns' && tier.next && (
                                                <div style={{ minWidth: 100 }}>
                                                    <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 2 }}>
                                                        {user.totalProjects}/{tier.next} → {tier.nextLabel}
                                                    </div>
                                                    <ProgressBar percent={tier.progress} color={tier.color} />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {activeTab === 'interns' && leaderboard.some(u => u.totalProjects >= 21) && (
                            <div style={{ marginTop: 28, background: `linear-gradient(135deg, ${Brand.PrimaryPurple}, ${Brand.PrimaryDark})`, borderRadius: 14, padding: '22px 28px', color: Brand.TextLight }}>
                                <div style={{ fontWeight: 900, fontSize: 16, marginBottom: 12 }}>🚀 Promoted to Employee</div>
                                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                    {leaderboard.filter(u => u.totalProjects >= 21).map(u => (
                                        <div key={u.name} style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '8px 16px', fontWeight: 700, fontSize: 13 }}>
                                            {u.avatar} {u.name} · {u.totalProjects} projects
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default Achievements;