import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '../Sidebar';
import { db } from "../firebase"; 

const PROJECTS_KEY = 'proj_data';
const STORAGE_KEY = 'ach_leaderboard';
const getCurrentMonthKey = () => new Date().toLocaleDateString('en-US', { year: 'numeric', month: '2-digit' });

const EMPLOYEES_LIST = [];
const INTERNS_LIST = [];

const svgBase = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };

const Icon = ({ type, size = 20, color }) => {
    const p = { ...svgBase, width: size, height: size, style: color ? { color } : undefined };
    switch (type) {
        case 'users': return <svg {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
        case 'briefcase': return <svg {...p}><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>;
        case 'trending-up': return <svg {...p}><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
        case 'check-circle': return <svg {...p}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
        case 'clock': return <svg {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
        case 'alert-triangle': return <svg {...p}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
        case 'award': return <svg {...p}><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>;
        case 'graduation': return <svg {...p}><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c0 1.1 2.7 3 6 3s6-1.9 6-3v-5"/></svg>;
        case 'calendar': return <svg {...p}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
        case 'arrow-right': return <svg {...p}><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;
        case 'zap': return <svg {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
        case 'layers': return <svg {...p}><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>;
        case 'target': return <svg {...p}><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>;
        case 'bar-chart': return <svg {...p}><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>;
        case 'activity': return <svg {...p}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
        default: return null;
    }
};

const styles = `
.dash-page { margin-left: 260px; max-width: calc(100% - 260px); padding: 32px 40px 48px; min-height: 100vh; background: #F5F0E5; }
.dash-header { margin-bottom: 28px; }
.dash-greeting { font-size: 26px; font-weight: 800; color: #2D1B38; letter-spacing: -0.03em; line-height: 1.2; }
.dash-greeting span { color: #623068; }
.dash-sub { font-size: 14px; color: #47234F; margin-top: 6px; }
.dash-date { display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px; font-weight: 600; color: #331B3F; margin-top: 10px; }
.dash-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
.dash-stat-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 20px; position: relative; overflow: hidden; transition: all 0.2s ease; }
.dash-stat-card:hover { box-shadow: 0 4px 16px rgba(98, 48, 104, 0.08); transform: translateY(-2px); }
.dash-stat-icon { width: 42px; height: 42px; border-radius: 10px; display: flex; align-items: center; justify-content: center; margin-bottom: 14px; }
.dash-stat-val { font-size: 30px; font-weight: 800; color: #2D1B38; line-height: 1; letter-spacing: -0.02em; }
.dash-stat-lbl { font-size: 12px; font-weight: 500; color: #47234F; margin-top: 6px; text-transform: uppercase; letter-spacing: 0.04em; }
.dash-stat-badge { position: absolute; top: 16px; right: 16px; display: inline-flex; align-items: center; gap: 3px; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 700; }
.dash-stat-badge.up { background: #F0EAF8; color: #623068; }
.dash-stat-badge.neutral { background: #f8fafc; color: #94a3b8; }
.dash-stat-glow { position: absolute; width: 120px; height: 120px; border-radius: 50%; opacity: 0.06; top: -30px; right: -30px; }
.dash-grid { display: grid; grid-template-columns: 1fr 380px; gap: 20px; margin-bottom: 28px; }
.dash-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; }
.dash-card-head { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px 14px; border-bottom: 1px solid #f1f5f9; }
.dash-card-title { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 700; color: #2D1B38; }
.dash-card-count { font-size: 11px; font-weight: 600; color: #623068; background: #F0EAF8; padding: 2px 8px; border-radius: 6px; }
.dash-card-body { padding: 4px 0; }
.dash-card-link { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; color: #0D7289; cursor: pointer; padding: 10px 20px; border-top: 1px solid #f1f5f9; transition: background 0.15s ease; text-decoration: none; }
.dash-card-link:hover { background: #F5F0E5; }
.dash-activity-item { display: flex; align-items: flex-start; gap: 12px; padding: 12px 20px; transition: background 0.1s ease; }
.dash-activity-item:hover { background: #F0EAF8; }
.dash-activity-dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 6px; flex-shrink: 0; }
.dash-activity-dot.green { background: #623068; }
.dash-activity-dot.amber { background: #C0854A; }
.dash-activity-dot.blue { background: #0D7289; }
.dash-activity-dot.purple { background: #331B3F; }
.dash-activity-text { font-size: 13px; color: #331B3F; line-height: 1.4; }
.dash-activity-text strong { font-weight: 600; color: #2D1B38; }
.dash-activity-time { font-size: 11px; color: #94a3b8; margin-top: 2px; }
.dash-deadline-item { display: flex; align-items: center; gap: 12px; padding: 11px 20px; transition: background 0.1s ease; }
.dash-deadline-item:hover { background: #F5F0E5; }
.dash-deadline-avatar { width: 30px; height: 30px; border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: #fff; flex-shrink: 0; }
.dash-deadline-info { flex: 1; min-width: 0; }
.dash-deadline-proj { font-size: 13px; font-weight: 600; color: #331B3F; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dash-deadline-name { font-size: 11px; color: #47234F; }
.dash-deadline-date { font-size: 11px; font-weight: 600; padding: 3px 8px; border-radius: 6px; white-space: nowrap; flex-shrink: 0; }
.dash-deadline-date.overdue { background: #fff1f2; color: #8A1C37; }
.dash-deadline-date.soon { background: #fefce8; color: #C0854A; }
.dash-deadline-date.safe { background: #ecfdf5; color: #0D7289; }
.dash-perf-bar-wrap { padding: 14px 20px; }
.dash-perf-item { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.dash-perf-item:last-child { margin-bottom: 0; }
.dash-perf-avatar { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: #fff; flex-shrink: 0; }
.dash-perf-info { flex: 1; min-width: 0; }
.dash-perf-name { font-size: 12px; font-weight: 600; color: #2D1B38; }
.dash-perf-role { font-size: 10px; color: #47234F; }
.dash-perf-bar-bg { width: 100%; height: 6px; background: #f1f5f9; border-radius: 3px; margin-top: 5px; overflow: hidden; }
.dash-perf-bar-fill { height: 100%; border-radius: 3px; transition: width 0.6s ease; }
.dash-perf-count { font-size: 13px; font-weight: 700; color: #2D1B38; flex-shrink: 0; min-width: 20px; text-align: right; }
.dash-skel { background: #e2e8f0; border-radius: 8px; }
.dash-empty { text-align: center; padding: 32px 20px; }
.dash-empty p { font-size: 13px; color: #94a3b8; }
.dash-actions { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.dash-action-btn { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 20px 16px; background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; cursor: pointer; transition: all 0.2s ease; font-family: inherit; text-decoration: none; }
.dash-action-btn:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.06); transform: translateY(-2px); border-color: #623068; }
.dash-action-icon { width: 44px; height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
.dash-action-label { font-size: 12px; font-weight: 600; color: #2D1B38; }
.dash-action-desc { font-size: 10px; color: #47234F; text-align: center; line-height: 1.3; }
.dash-bottom-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
`;

if (typeof document !== 'undefined' && !document.getElementById('dash-styles-final')) {
    const tag = document.createElement('style');
    tag.id = 'dash-styles-final';
    tag.textContent = styles;
    document.head.appendChild(tag);
}

const timeAgo = (isoStr) => {
    if (!isoStr) return '';
    const seconds = Math.floor((new Date() - new Date(isoStr)) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return minutes + 'm ago';
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return hours + 'h ago';
    const days = Math.floor(hours / 24);
    if (days < 7) return days + 'd ago';
    return new Date(isoStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const daysUntil = (dateStr) => {
    const now = new Date(); now.setHours(0,0,0,0);
    const target = new Date(dateStr); target.setHours(0,0,0,0);
    return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
};

const Dashboard = ({ onNavigate }) => {
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState([]);
    const [stats, setStats] = useState({ total_team: 0, active_projects: 0, completed_month: 0, overdue: 0 });
    const [currentDate] = useState(new Date());

    const fetchDashboardData = async () => {
   try {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;
    const hfToken = import.meta.env.VITE_HF_TOKEN; // 1. Token variable load karein

    const response = await fetch(`${backendUrl}/dashboard-stats`, {
        // 2. Token yahan lagaya jayega
        method: 'GET', 
        headers: {
            'Authorization': `Bearer ${hfToken}`, // ✅ Ye line sabse aham hai
            'Content-Type': 'application/json'
        }
    });

    if (response.ok) {
        const data = await response.json();
        setStats(data);
        if (data.projects_list) {
            setProjects(data.projects_list);
        }
    }
} catch (error) {
    console.error("Dashboard data fetch error:", error);
} finally {
    setLoading(false);
}
};
    useEffect(() => {
        fetchDashboardData();
        const interval = setInterval(fetchDashboardData, 30000);
        return () => clearInterval(interval);
    }, []);

    const inProgress = useMemo(() => projects.filter(p => p.status === 'in-progress'), [projects]);
    const completed = useMemo(() => projects.filter(p => p.status === 'completed'), [projects]);
    const thisMonthCompleted = useMemo(() => {
        const mk = getCurrentMonthKey();
        return completed.filter(p => p.completedAt && new Date(p.completedAt).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit' }) === mk);
    }, [completed]);
    
    const completionRate = projects.length > 0 ? Math.round(completed.length / projects.length * 100) : 0;
    const overdueCount = useMemo(() => inProgress.filter(p => daysUntil(p.deadline) < 0).length, [inProgress]);
    const dueSoonCount = useMemo(() => inProgress.filter(p => { const d = daysUntil(p.deadline); return d >= 0 && d <= 3; }).length, [inProgress]);

    const workload = useMemo(() => {
        const map = {};
        inProgress.forEach(p => {
            const key = p.personName || "Unknown"; 
            if (!map[key]) map[key] = { ...p, count: 0 };
            map[key].count++;
        });
        return Object.values(map).sort((a, b) => b.count - a.count);
    }, [inProgress]);

    const topPerformers = useMemo(() => {
        const map = {};
        thisMonthCompleted.forEach(p => {
            if (!map[p.personId]) map[p.personId] = { ...p, count: 0 };
            map[p.personId].count++;
        });
        return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 5);
    }, [thisMonthCompleted]);

    const upcomingDeadlines = useMemo(() => {
        return [...inProgress].sort((a, b) => new Date(a.deadline) - new Date(b.deadline)).slice(0, 6);
    }, [inProgress]);

    const activityFeed = useMemo(() => {
        const items = [];
        completed.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt)).slice(0, 4).forEach(p => {
            const ot = p.completedAt && p.deadline ? new Date(p.completedAt) <= new Date(p.deadline + 'T23:59:59') : false;
            items.push({ type: 'completed', dot: ot ? 'green' : 'amber', text: <><strong>{p.personName}</strong> completed <strong>{p.projectName}</strong> {ot ? <span style={{color:'#0D7289', fontWeight:600}}>on time</span> : <span style={{color:'#8A1C37', fontWeight:600}}>late</span>}</>, time: p.completedAt });
        });
        inProgress.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3).forEach(p => {
            items.push({ type: 'assigned', dot: 'blue', text: <><strong>{p.personName}</strong> was assigned <strong>{p.projectName}</strong></>, time: p.createdAt });
        });
        return items.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 6);
    }, [completed, inProgress]);

    const greeting = () => {
        const h = currentDate.getHours();
        if (h < 12) return 'Good Morning';
        if (h < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    if (loading) {
        return (
            <>
                <Sidebar onNavigate={onNavigate} />
                <div className="dash-page">
                    <div style={{marginBottom:28}}>
                        <div className="dash-skel" style={{width:260,height:32}}></div>
                        <div className="dash-skel" style={{width:320,height:16,marginTop:8}}></div>
                    </div>
                </div>
            </>
        );
    }

    return (
        <>
            <Sidebar onNavigate={onNavigate} />
            <div className="dash-page">
                <div className="dash-header">
                    <div className="dash-greeting">{greeting()}, <span>Admin</span> </div>
                    <div className="dash-sub">Here's what's happening at WellMind Data Solutions.</div>
                    <div className="dash-date">
                        <Icon type="calendar" size={13} color="#623068" />
                        {currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </div>
                </div>

                <div className="dash-stats">
                    <div className="dash-stat-card">
                        <div className="dash-stat-glow" style={{background:'#623068'}}></div>
                        <div className="dash-stat-icon" style={{background:'#F0EAF8'}}>
                            <Icon type="users" size={20} color="#623068" />
                        </div>
                        <div className="dash-stat-val">{stats.total_team || (EMPLOYEES_LIST.length + INTERNS_LIST.length)}</div>
                        <div className="dash-stat-lbl">Total Team</div>
                        <div className="dash-stat-badge neutral">{EMPLOYEES_LIST.length} emp · {INTERNS_LIST.length} int</div>
                    </div>
                    <div className="dash-stat-card">
                        <div className="dash-stat-glow" style={{background:'#0D7289'}}></div>
                        <div className="dash-stat-icon" style={{background:'#e0f2f1'}}>
                            <Icon type="briefcase" size={20} color="#0D7289" />
                        </div>
                        <div className="dash-stat-val">{stats.active_projects || inProgress.length}</div>
                        <div className="dash-stat-lbl">Active Projects</div>
                        <div className="dash-stat-badge up" style={{background:'#e0f2f1', color:'#0D7289'}}>Live</div>
                    </div>
                    <div className="dash-stat-card">
                        <div className="dash-stat-glow" style={{background:'#C0854A'}}></div>
                        <div className="dash-stat-icon" style={{background:'#fdf6ef'}}>
                            <Icon type="check-circle" size={20} color="#C0854A" />
                        </div>
                        <div className="dash-stat-val">{stats.completed_month || thisMonthCompleted.length}</div>
                        <div className="dash-stat-lbl">Done This Month</div>
                        <div className="dash-stat-badge up" style={{background:'#fdf6ef', color:'#C0854A'}}>{completionRate}%</div>
                    </div>
                    <div className="dash-stat-card">
                        <div className="dash-stat-glow" style={{background:'#8A1C37'}}></div>
                        <div className="dash-stat-icon" style={{background: (stats.overdue || overdueCount) > 0 ? '#fff1f2' : '#F0EAF8'}}>
                            <Icon type="alert-triangle" size={20} color={(stats.overdue || overdueCount) > 0 ? '#8A1C37' : '#623068'} />
                        </div>
                        <div className="dash-stat-val">{stats.overdue || overdueCount}</div>
                        <div className="dash-stat-lbl">Overdue</div>
                        <div className="dash-stat-badge">{dueSoonCount > 0 ? dueSoonCount + ' due soon' : 'All clear'}</div>
                    </div>
                </div>

                <div className="dash-grid">
                    <div className="dash-card">
                        <div className="dash-card-head">
                            <div className="dash-card-title">
                                <Icon type="activity" size={16} color="#0D7289" />
                                Recent Activity
                            </div>
                            <div className="dash-card-count">{activityFeed.length}</div>
                        </div>
                        <div className="dash-card-body">
                            {activityFeed.length === 0 ? <div className="dash-empty"><p>No recent activity</p></div> : 
                                activityFeed.map((item, i) => (
                                    <div key={i} className="dash-activity-item">
                                        <div className={`dash-activity-dot ${item.dot}`}></div>
                                        <div>
                                            <div className="dash-activity-text">{item.text}</div>
                                            <div className="dash-activity-time">{timeAgo(item.time)}</div>
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                        <div className="dash-card-link" onClick={() => onNavigate && onNavigate('projects')}>
                            View all projects <Icon type="arrow-right" size={12} color="#0D7289" />
                        </div>
                    </div>

                    <div className="dash-card">
                        <div className="dash-card-head">
                            <div className="dash-card-title">
                                <Icon type="clock" size={16} color="#C0854A" />
                                Upcoming Deadlines
                            </div>
                            <div className="dash-card-count">{upcomingDeadlines.length}</div>
                        </div>
                        <div className="dash-card-body">
                            {upcomingDeadlines.length === 0 ? <div className="dash-empty"><p>No upcoming deadlines</p></div> : 
                                upcomingDeadlines.map(proj => {
                                    const d = daysUntil(proj.deadline);
                                    let cls = 'safe', label = d + 'd left';
                                    if (d < 0) { cls = 'overdue'; label = Math.abs(d) + 'd overdue'; }
                                    else if (d <= 3) { cls = 'soon'; label = d === 0 ? 'Today' : d + 'd left'; }
                                    return (
                                        <div key={proj.id} className="dash-deadline-item">
                                            <div className="dash-deadline-avatar" style={{backgroundColor:proj.personAvatarColor || '#623068'}}>{proj.personAvatar}</div>
                                            <div className="dash-deadline-info">
                                                <div className="dash-deadline-proj">{proj.projectName}</div>
                                                <div className="dash-deadline-name">{proj.personName}</div>
                                            </div>
                                            <div className={`dash-deadline-date ${cls}`}>{label}</div>
                                        </div>
                                    );
                                })
                            }
                        </div>
                        <div className="dash-card-link" onClick={() => onNavigate && onNavigate('projects')}>View all <Icon type="arrow-right" size={12} color="#0D7289" /></div>
                    </div>
                </div>

                <div className="dash-bottom-grid" style={{marginBottom:28}}>
                    <div className="dash-card">
                        <div className="dash-card-head">
                            <div className="dash-card-title"><Icon type="bar-chart" size={16} color="#623068" /> Team Workload</div>
                        </div>
                        <div className="dash-perf-bar-wrap">
                            {workload.map((w, i) => (
                                <div key={i} className="dash-perf-item">
                                    <div className="dash-perf-avatar" style={{backgroundColor:w.personAvatarColor || '#623068'}}>{w.personAvatar}</div>
                                    <div className="dash-perf-info">
                                        <div className="dash-perf-name">{w.personName}</div>
                                        <div className="dash-perf-bar-bg"><div className="dash-perf-bar-fill" style={{width:'50%',background:'#623068'}}></div></div>
                                    </div>
                                    <div className="dash-perf-count">{w.count}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="dash-card">
                        <div className="dash-card-head">
                            <div className="dash-card-title"><Icon type="award" size={16} color="#C0854A" /> Top Performers</div>
                        </div>
                        <div className="dash-perf-bar-wrap">
                            {topPerformers.map((p, i) => (
                                <div key={i} className="dash-perf-item">
                                    <div className="dash-perf-avatar" style={{backgroundColor:p.personAvatarColor || '#0D7289'}}>{p.personAvatar}</div>
                                    <div className="dash-perf-info">
                                        <div className="dash-perf-name">{p.personName}</div>
                                        <div className="dash-perf-bar-bg"><div className="dash-perf-bar-fill" style={{width:'70%',background:'#0D7289'}}></div></div>
                                    </div>
                                    <div className="dash-perf-count">{p.count}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="dash-bottom-grid">
                    <div className="dash-card">
                        <div className="dash-card-head">
                            <div className="dash-card-title"><Icon type="target" size={16} color="#623068" /> Quick Actions</div>
                        </div>
                        <div style={{padding:'16px'}}>
                            <div className="dash-actions">
                                <button className="dash-action-btn" onClick={() => onNavigate && onNavigate('projects')}>
                                    <div className="dash-action-icon" style={{background:'#F0EAF8'}}><Icon type="briefcase" size={20} color="#623068" /></div>
                                    <div className="dash-action-label">Add Project</div>
                                </button>
                                <button className="dash-action-btn" onClick={() => onNavigate && onNavigate('projects')}>
                                    <div className="dash-action-icon" style={{background:'#e0f2f1'}}><Icon type="graduation" size={20} color="#0D7289" /></div>
                                    <div className="dash-action-label">Intern Tasks</div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Dashboard;