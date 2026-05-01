import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '../Sidebar';
import { db } from "../firebase"; 
import { collection, addDoc, updateDoc, doc, onSnapshot, query, orderBy, getDocs, deleteDoc } from "firebase/firestore";

/* ─── WellMind Brand Palette ────────────────────────────────────── */
const BRAND = {
  primaryPurple: "#623068",
  primaryDark:   "#331B3F",
  primaryMid:    "#47234F",
  secondaryRed:  "#8A1C37",
  actionTeal:    "#0D7289",
  accentGold:    "#C0854A",
  mainBG:        "#F5F0E5",
  darkBG:        "#1A1228",
  textMain:      "#2D1B38",
  textLight:     "#F0EAF8",
};

const Projects = ({ onNavigate }) => {
    const [allProjects, setAllProjects] = useState([]);
    const [dbPeople, setDbPeople] = useState([]);
    const [activeTab, setActiveTab] = useState('employees');
    const [modalOpen, setModalOpen] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    // Updated Form State
    const [form, setForm] = useState({ projectName: '', deadline: '' });
    const [selectedPeople, setSelectedPeople] = useState([]); // Array for multiple IDs
    const [currentSelect, setCurrentSelect] = useState(""); // Temporary dropdown state

    useEffect(() => {
        const q = query(collection(db, "projects"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setAllProjects(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const fetchPeople = async () => {
            try {
                const snap = await getDocs(collection(db, activeTab));
                setDbPeople(snap.docs.map(d => ({ id: d.id, name: d.data().name })));
            } catch (e) { console.error(e); }
        };
        fetchPeople();
    }, [activeTab, modalOpen]);

    // Logic to add person to list
    const addPersonToList = () => {
        if (currentSelect && !selectedPeople.includes(currentSelect)) {
            setSelectedPeople([...selectedPeople, currentSelect]);
            setCurrentSelect(""); // Reset dropdown after adding
        }
    };

    const removePersonFromList = (id) => {
        setSelectedPeople(selectedPeople.filter(p => p !== id));
    };

    const handleToggleComplete = async (project) => {
        const isNowCompleted = project.status !== 'completed';
        try {
            await updateDoc(doc(db, "projects", project.id), {
                status: isNowCompleted ? 'completed' : 'in-progress',
                completedAt: isNowCompleted ? new Date().toISOString() : null 
            });
        } catch (e) { console.error(e); }
    };

    // === NEW DELETE FUNCTION ===
    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to remove this assignment?")) return;

        try {
            await deleteDoc(doc(db, "projects", id));
            setAllProjects(prev => prev.filter(p => p.id !== id));
        } catch (error) {
            console.error("Error deleting project:", error);
            alert("Failed to delete assignment");
        }
    };

    const getStatusInfo = (project) => {
        if (project.status === 'completed') return <span style={completedBadge}>Completed</span>;
        const now = new Date();
        const due = new Date(project.deadline);
        if (now > due) return <span style={overdueBadge}>Overdue</span>;
        return <span style={progressBadge}>In Progress</span>;
    };

    const handleSubmit = async () => {
        if (selectedPeople.length === 0 || !form.projectName || !form.deadline) return alert("Add at least one member and fill all fields");
        setSubmitting(true);
        
        // Map IDs to Names for display in table
        const assignedNames = selectedPeople.map(id => dbPeople.find(p => p.id === id)?.name).join(", ");

        try {
            await addDoc(collection(db, "projects"), {
                selectedPeople: selectedPeople, // Saving Array of IDs
                projectName: form.projectName, 
                deadline: form.deadline,
                personName: assignedNames, // Saving comma separated names for table
                personType: activeTab, 
                status: 'in-progress', 
                createdAt: new Date().toISOString()
            });
            setModalOpen(false);
            setForm({ projectName: '', deadline: '' });
            setSelectedPeople([]);
        } catch (e) { console.error(e); }
        setSubmitting(false);
    };

    const filteredProjects = useMemo(() => allProjects.filter(p => p.personType === activeTab), [allProjects, activeTab]);

    /* ─── Styles ─── */
    const pageLayout = { display: "flex", minHeight: "100vh", backgroundColor: BRAND.mainBG };
    const sidebarWrapper = { width: "260px", position: "fixed", height: "100vh", zIndex: 100 };
    const mainContent = { flex: 1, marginLeft: "260px", padding: "40px", fontFamily: "'Inter', sans-serif" };
    const titleStyle = { fontSize: '28px', color: BRAND.textMain, margin: 0, fontWeight: 700 };
    const subtitleStyle = { color: BRAND.primaryPurple, margin: '5px 0 0 0' };
    const primaryBtn = { background: BRAND.primaryPurple, color: BRAND.textLight, border: 'none', padding: '12px 24px', borderRadius: '10px', cursor: 'pointer', fontWeight: 600 };
    const tabActive = { padding: '10px 20px', border: 'none', background: BRAND.primaryPurple, color: BRAND.textLight, borderRadius: '10px', fontWeight: 600, cursor: 'pointer' };
    const tabInactive = { padding: '10px 20px', border: 'none', background: 'transparent', color: BRAND.primaryMid, cursor: 'pointer' };
    const thStyle = { padding: '18px 20px', textAlign: 'left', color: BRAND.primaryMid, fontSize: '11px', textTransform: 'uppercase', fontWeight: '800', background: '#f8fafc' };
    const progressBadge = { background: '#eff6ff', color: BRAND.actionTeal, padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' };
    const overdueBadge = { background: '#fef2f2', color: BRAND.secondaryRed, padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '700' };
    const completedBadge = { background: '#f0fdf4', color: '#16a34a', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' };
    const submitBtn = { flex: 1, background: BRAND.actionTeal, color: '#fff', border: 'none', padding: '14px', borderRadius: '10px', fontWeight: '600', cursor: 'pointer' };

    // Action Buttons Styles for Table
    const doneBtnStyle = { padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#e2e8f0', color: '#64748b', cursor: 'pointer', fontSize: '12px', fontWeight: '600', transition: 'all 0.2s' };
    const doneBtnHover = (status) => status === 'completed' ? { background: '#dcfce7', color: '#15803d' } : { background: BRAND.actionTeal, color: '#fff' };
    const deleteBtnStyle = { padding: '8px 12px', borderRadius: '8px', border: 'none', background: '#fee2e2', color: '#ef4444', cursor: 'pointer', fontSize: '14px', transition: 'all 0.2s' };

    return (
        <div style={pageLayout}>
            <div style={sidebarWrapper}><Sidebar onNavigate={onNavigate} /></div>
            <div style={mainContent}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 40 }}>
                    <div><h2 style={titleStyle}>WellMind Projects</h2><p style={subtitleStyle}>Track task assignments</p></div>
                    <button onClick={() => setModalOpen(true)} style={primaryBtn}>+ New Assignment</button>
                </div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 25 }}>
                    <button onClick={() => setActiveTab('employees')} style={activeTab === 'employees' ? tabActive : tabInactive}>Team Members</button>
                    <button onClick={() => setActiveTab('interns')} style={activeTab === 'interns' ? tabActive : tabInactive}>Intern Program</button>
                </div>
                <div style={{ backgroundColor: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th style={thStyle}>Assigned To</th>
                                <th style={thStyle}>Project</th>
                                <th style={thStyle}>Status</th>
                                <th style={{...thStyle, textAlign: 'center', width: '180px'}}>Actions</th> {/* Changed column name and width */}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProjects.map(p => (
                                <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '20px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: BRAND.primaryPurple, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{p.personName?.charAt(0)}</div>
                                            <span style={{ fontWeight: 600, color: BRAND.textMain, fontSize: '13px' }}>{p.personName}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '20px', color: BRAND.textMain }}>{p.projectName}</td>
                                    <td style={{ padding: '20px' }}>{getStatusInfo(p)}</td>
                                    
                                    {/* NEW ACTIONS COLUMN */}
                                    <td style={{ padding: '20px', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}>
                                            {/* Done Button */}
                                            <button 
                                                onClick={() => handleToggleComplete(p)} 
                                                style={{ ...doneBtnStyle, ...doneBtnHover(p.status) }}
                                                title={p.status === 'completed' ? 'Mark as Incomplete' : 'Mark as Completed'}
                                            >
                                                ✓
                                            </button>
                                            
                                            {/* Delete Button */}
                                            <button 
                                                onClick={() => handleDelete(p.id)} 
                                                style={deleteBtnStyle}
                                                title="Delete Assignment"
                                                onMouseOver={(e) => e.currentTarget.style.background = '#fecaca'}
                                                onMouseOut={(e) => e.currentTarget.style.background = '#fee2e2'}
                                            >
                                                🗑
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {modalOpen && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(26, 18, 40, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: '#fff', padding: 35, borderRadius: 20, width: 400, boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ color: BRAND.primaryDark, marginTop: 0, marginBottom: 20 }}>New Assignment</h3>
                        
                        {/* Member Selection Row */}
                        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                            <select 
                                style={{ flex: 1, padding: 12, borderRadius: 8, border: '1px solid #ddd', outline: 'none' }} 
                                value="" // Isse hamesha "Select Member..." reset rahega
                                onChange={e => {
                                    const selectedId = e.target.value;
                                    if (selectedId && !selectedPeople.includes(selectedId)) {
                                        const newSelection = [...selectedPeople, selectedId];
                                        setSelectedPeople(newSelection);
                                    }
                                }}
                            >
                                <option value="" disabled>Select Member...</option>
                                {dbPeople.length > 0 ? (
                                    dbPeople.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.name}
                                        </option>
                                    ))
                                ) : (
                                    <option disabled>No members found in {activeTab}</option>
                                )}
                            </select>
                            <button 
                                onClick={addPersonToList}
                                style={{ background: BRAND.primaryPurple, color: '#fff', border: 'none', width: 45, borderRadius: 8, fontSize: 20, cursor: 'pointer', fontWeight: 'bold' }}
                            >+</button>
                        </div>

                        {/* Visual Tags for Selected Members */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 20, minHeight: '30px', border: '1px dashed #ddd', padding: 10, borderRadius: 8 }}>
                            {selectedPeople.length > 0 ? selectedPeople.map(id => (
                                <span key={id} style={{ background: BRAND.textLight, color: BRAND.primaryPurple, padding: '4px 10px', borderRadius: 15, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                                    {dbPeople.find(p => p.id === id)?.name}
                                    <b onClick={() => removePersonFromList(id)} style={{ cursor: 'pointer', color: BRAND.secondaryRed, fontWeight: 900, fontSize: 14 }}>×</b>
                                </span>
                            )) : <span style={{ color: '#999', fontSize: 12 }}>No members selected</span>}
                        </div>

                        <input style={{ width: '100%', padding: 12, marginBottom: 20, borderRadius: 8, border: '1px solid #ddd' }} type="text" placeholder="Project Name" value={form.projectName} onChange={e => setForm({...form, projectName: e.target.value})} />
                        <input style={{ width: '100%', padding: 12, marginBottom: 20, borderRadius: 8, border: '1px solid #ddd' }} type="date" value={form.deadline} onChange={e => setForm({...form, deadline: e.target.value})} />
                        
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button onClick={handleSubmit} style={submitBtn}>{submitting ? 'Assigning...' : 'Assign'}</button>
                            <button onClick={() => setModalOpen(false)} style={{ background: '#f1f5f9', border: 'none', padding: 14, borderRadius: 10, cursor: 'pointer' }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Projects;