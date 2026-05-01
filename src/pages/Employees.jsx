import React, { useState, useEffect, useMemo, useCallback } from 'react';
import PageWrapper from '../PageWrapper';
import { GraduationCap } from 'lucide-react';
// Firebase Storage imports (Image upload ke liye zaroori)
import { getStorage, ref, uploadString, getDownloadURL, deleteObject } from "firebase/storage";
// 'db' agar required lage to rakh sakte hain, lekin data fetch hum API se karenge
// import { db } from "../firebase"; 

// ============================================================
// WellMind Brand Palette
// ============================================================

const DEPARTMENTS = [];
const ROLES = [];
const RANKS = [ 'Junior', 'Mid-Level', 'Senior', 'Elit', 'Pro'];
const EMP_TYPES = ['Full Time', 'Part Time', 'Intern'];
const LOCATIONS = [];
const AVATAR_COLORS = ['#623068', '#0D7289', '#8A1C37', '#47234F', '#C0854A', '#331B3F'];

// Firebase config (Storage ke liye)
const firebaseConfig = {
  apiKey: "AIzaSyBvjHyPx22L07i_1rld6yj102z2X1ZmNdg",
  authDomain: "softwarehouse-123.firebaseapp.com",
  projectId: "softwarehouse-123",
  storageBucket: "softwarehouse-123.firebasestorage.app",
  messagingSenderId: "651262337489",
  appId: "1:651262337489:web:01573199ffc8c24455c0f0"
};

// Initialize Firebase (Sirf Storage ke liye)
import { initializeApp, getApps } from "firebase/app";
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const storage = getStorage(app);

const getInitials = (name) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
const generateId = () => 'emp_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const pickColor = () => AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

const getPerformanceColor = (val) => {
    if (val >= 90) return '#0D7289';
    if (val >= 75) return '#C0854A';
    return '#8A1C37';
};

const getPerformanceLabel = (val) => {
    if (val >= 90) return 'Excellent';
    if (val >= 75) return 'Good';
    if (val >= 60) return 'Average';
    return 'Needs Improvement';
};

const getStatusStyle = (status) => {
    switch (status) {
        case 'Active':   return { bg: '#e6f4f7', color: '#0D7289', dot: '#0D7289' };
        case 'On Leave': return { bg: '#fef3e2', color: '#C0854A', dot: '#C0854A' };
        case 'Inactive': return { bg: '#f3eef5', color: '#623068', dot: '#9B6EA0' };
        default:         return { bg: '#f3eef5', color: '#623068', dot: '#9B6EA0' };
    }
};

const svgBase = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
const Icon = ({ type, size = 20, color }) => {
    const p = { ...svgBase, width: size, height: size, style: color ? { color } : undefined };
    switch (type) {
        case 'search': return <svg {...p}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
        case 'plus': return <svg {...p}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
        case 'close': return <svg {...p}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
        case 'mail': return <svg {...p}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>;
        case 'phone': return <svg {...p}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
        case 'folder': return <svg {...p}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>;
        case 'clock': return <svg {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
        case 'alert': return <svg {...p}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
        case 'check': return <svg {...p}><polyline points="20 6 9 17 4 12"/></svg>;
        case 'building': return <svg {...p}><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>;
        case 'award': return <svg {...p}><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>;
        case 'edit': return <svg {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>;
        case 'trash': return <svg {...p}><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>;
        case 'info': return <svg {...p}><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;
        case 'leave': return <svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="15" x2="15" y2="15"/></svg>;
        case 'calendar-off': return <svg {...p}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="1" y1="1" x2="23" y2="23"/></svg>;
        default: return null;
    }
};

const DEPT_COLORS = {
    Engineering: { bg: '#e6f4f7', color: '#0D7289', icon: '#0D7289' },
    Design:      { bg: '#f3eef5', color: '#623068', icon: '#623068' },
    Marketing:   { bg: '#fef3e2', color: '#C0854A', icon: '#C0854A' },
    QA:          { bg: '#e6f4f7', color: '#0D7289', icon: '#0D7289' },
    DevOps:      { bg: '#fde8ed', color: '#8A1C37', icon: '#8A1C37' },
    HR:          { bg: '#ede8f2', color: '#47234F', icon: '#47234F' },
    Finance:     { bg: '#fef3e2', color: '#C0854A', icon: '#C0854A' },
};

// CSS Styles (same as before - keeping it concise)
const styles = `
.tm-dept-stats { display: flex; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
.tm-dept-chip { display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; background: #ffffff; border: 1px solid rgba(98,48,104,0.15); border-radius: 10px; font-size: 13px; font-weight: 500; color: #47234F; transition: all 0.15s ease; cursor: default; }
.tm-dept-chip:hover { border-color: #623068; box-shadow: 0 2px 8px rgba(98,48,104,0.1); }
.tm-dept-chip .tm-dept-icon { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.tm-dept-chip .tm-dept-name { font-weight: 600; color: #2D1B38; }
.tm-dept-chip .tm-dept-count { font-weight: 700; color: #623068; }
.tm-filter-bar { display: flex; align-items: center; gap: 14px; margin-bottom: 22px; flex-wrap: wrap; }
.tm-search-box { flex: 1; max-width: 360px; position: relative; }
.tm-search-box input { width: 100%; padding: 9px 14px 9px 40px; font-size: 13px; color: #2D1B38; background: #ffffff; border: 1.5px solid rgba(98,48,104,0.2); border-radius: 10px; outline: none; transition: border-color 0.15s ease; font-family: inherit; }
.tm-search-box input:focus { border-color: #0D7289; box-shadow: 0 0 0 3px rgba(13,114,137,0.08); }
.tm-search-box input::placeholder { color: #9B6EA0; }
.tm-search-box svg { position: absolute; left: 13px; top: 50%; transform: translateY(-50%); color: #623068; pointer-events: none; }
.tm-filter-tabs { display: flex; gap: 4px; background: #F5F0E5; border-radius: 10px; padding: 3px; flex-wrap: wrap; }
.tm-filter-tab { padding: 7px 14px; font-size: 12px; font-weight: 500; color: #47234F; background: none; border: none; border-radius: 7px; cursor: pointer; transition: all 0.15s ease; font-family: inherit; white-space: nowrap; }
.tm-filter-tab:hover { color: #2D1B38; background: rgba(98,48,104,0.08); }
.tm-filter-tab.active { color: #F0EAF8; background: #623068; font-weight: 600; }
.tm-cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 18px; }
.tm-emp-card { background: #ffffff; border: 1px solid rgba(98,48,104,0.12); border-radius: 14px; overflow: hidden; transition: all 0.2s ease; position: relative; }
.tm-emp-card:hover { box-shadow: 0 8px 24px rgba(98,48,104,0.12); transform: translateY(-2px); border-color: rgba(98,48,104,0.3); }
.tm-emp-card.tm-on-leave { opacity: 0.85; }
.tm-emp-card.tm-on-leave:hover { opacity: 1; }
.tm-leave-stripe { position: absolute; top: 0; left: 0; right: 0; height: 3px; background: repeating-linear-gradient(90deg, #C0854A 0px, #C0854A 8px, #e8a86b 8px, #e8a86b 16px); opacity: 0; transition: opacity 0.3s ease; }
.tm-emp-card.tm-on-leave .tm-leave-stripe { opacity: 1; }
.tm-card-top { padding: 20px 20px 0; display: flex; align-items: flex-start; justify-content: space-between; }
.tm-card-emp-info { display: flex; align-items: center; gap: 14px; }
.tm-card-avatar { width: 46px; height: 46px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 15px; font-weight: 700; color: #F0EAF8; flex-shrink: 0; overflow: hidden; transition: filter 0.2s ease; }
.tm-card-avatar img { width: 100%; height: 100%; object-fit: cover; border-radius: 12px; display: block; }
.tm-emp-card.tm-on-leave .tm-card-avatar { filter: saturate(0.5); }
.tm-card-name-wrap { display: flex; flex-direction: column; }
.tm-card-name { font-size: 14px; font-weight: 700; color: #2D1B38; }
.tm-card-role { font-size: 12px; color: #623068; margin-top: 2px; }
.tm-status-badge { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; white-space: nowrap; }
.tm-status-dot { width: 6px; height: 6px; border-radius: 50%; }
.tm-card-body { padding: 16px 20px; }
.tm-card-contact { display: flex; flex-direction: column; gap: 7px; margin-bottom: 14px; }
.tm-contact-row { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #47234F; }
.tm-contact-row svg { color: #9B6EA0; flex-shrink: 0; }
.tm-contact-row span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tm-card-divider { height: 1px; background: #F5F0E5; margin: 0 -20px; }
.tm-card-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; padding: 14px 20px; }
.tm-stat-item { display: flex; flex-direction: column; gap: 6px; }
.tm-stat-label { font-size: 11px; font-weight: 500; color: #9B6EA0; text-transform: uppercase; letter-spacing: 0.04em; display: flex; align-items: center; gap: 5px; }
.tm-stat-value { font-size: 18px; font-weight: 800; color: #2D1B38; }
.tm-perf-bar-track { height: 6px; background: #F5F0E5; border-radius: 3px; overflow: hidden; margin-top: 4px; }
.tm-perf-bar-fill { height: 100%; border-radius: 3px; transition: width 0.5s ease; }
.tm-perf-label { font-size: 11px; font-weight: 600; }
.tm-card-footer { padding: 0 20px 16px; }
.tm-skills-wrap { display: flex; flex-wrap: wrap; gap: 5px; }
.tm-skill-tag { padding: 3px 9px; background: #F5F0E5; border-radius: 6px; font-size: 11px; font-weight: 500; color: #47234F; border: 1px solid rgba(98,48,104,0.1); }
.tm-card-leave-section { padding: 12px 20px; border-top: 1px solid #F5F0E5; display: flex; align-items: center; justify-content: space-between; }
.tm-leave-toggle-wrap { display: flex; align-items: center; gap: 10px; }
.tm-leave-toggle-label { font-size: 12px; font-weight: 600; color: #47234F; display: flex; align-items: center; gap: 5px; }
.tm-leave-toggle-label svg { color: #9B6EA0; transition: color 0.2s ease; }
.tm-leave-toggle-label.tm-active svg { color: #C0854A; }
.tm-leave-toggle { position: relative; width: 40px; height: 22px; cursor: pointer; flex-shrink: 0; }
.tm-leave-toggle input { opacity: 0; width: 0; height: 0; position: absolute; }
.tm-leave-track { position: absolute; inset: 0; background: #d8c8dc; border-radius: 11px; transition: background 0.25s ease; }
.tm-leave-toggle input:checked + .tm-leave-track { background: #C0854A; }
.tm-leave-thumb { position: absolute; top: 2px; left: 2px; width: 18px; height: 18px; background: #ffffff; border-radius: 50%; transition: transform 0.25s ease; box-shadow: 0 1px 3px rgba(0,0,0,0.15); }
.tm-leave-toggle input:checked ~ .tm-leave-thumb { transform: translateX(18px); }
.tm-leave-duration { font-size: 11px; font-weight: 600; color: #9B6EA0; background: #F5F0E5; border: 1px solid rgba(192,133,74,0.2); border-radius: 6px; padding: 3px 8px; display: flex; align-items: center; gap: 4px; transition: all 0.2s ease; }
.tm-leave-duration.tm-active { color: #C0854A; background: #fef3e2; border-color: #e8c49a; }
.tm-card-actions { display: flex; gap: 6px; padding: 12px 20px; border-top: 1px solid #F5F0E5; }
.tm-card-action-btn { display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; font-size: 11px; font-weight: 500; color: #47234F; background: #F5F0E5; border: 1px solid rgba(98,48,104,0.15); border-radius: 7px; cursor: pointer; transition: all 0.15s ease; font-family: inherit; }
.tm-card-action-btn:hover { color: #2D1B38; background: #ede4ee; }
.tm-card-action-btn.tm-action-edit:hover { color: #0D7289; background: #e6f4f7; border-color: rgba(13,114,137,0.3); }
.tm-card-action-btn.tm-action-delete:hover { color: #8A1C37; background: #fde8ed; border-color: #f5b8c4; }
.tm-checkin-badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; background: #e6f4f7; border: 1px solid rgba(13,114,137,0.25); border-radius: 6px; font-size: 10px; font-weight: 600; color: #0D7289; margin-top: 6px; }
.tm-emp-card.tm-on-leave .tm-checkin-badge { background: #fef3e2; border-color: rgba(192,133,74,0.3); color: #C0854A; }
.tm-pic-upload-wrap { grid-column: 1 / -1; margin-bottom: 4px; }
.tm-pic-preview { width: 72px; height: 72px; border-radius: 14px; overflow: hidden; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 700; color: #F0EAF8; border: 2px dashed rgba(98,48,104,0.3); cursor: pointer; flex-shrink: 0; transition: border-color 0.2s ease; }
.tm-pic-preview:hover { border-color: #623068; }
.tm-pic-preview img { width: 100%; height: 100%; object-fit: cover; display: block; }
.tm-no-results { text-align: center; padding: 60px 20px; }
.tm-no-results svg { color: #d8c8dc; margin-bottom: 16px; }
.tm-no-results h3 { font-size: 16px; font-weight: 600; color: #623068; margin-bottom: 4px; }
.tm-no-results p { font-size: 13px; color: #9B6EA0; }
.tm-modal-overlay { position: fixed; inset: 0; z-index: 900; background: rgba(26,18,40,0.6); backdrop-filter: blur(6px); display: flex; align-items: flex-start; justify-content: center; padding: 40px 20px; overflow-y: auto; animation: tmFadeIn 0.2s ease; }
.tm-modal-box { background: #F5F0E5; border-radius: 18px; width: 620px; max-width: 100%; box-shadow: 0 20px 60px rgba(26,18,40,0.35); animation: tmModalIn 0.3s ease-out; border: 1px solid rgba(98,48,104,0.15); }
@keyframes tmFadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes tmModalIn { from { opacity: 0; transform: scale(0.97) translateY(12px); } to { opacity: 1; transform: scale(1) translateY(0); } }
.tm-modal-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 28px 28px 0; }
.tm-modal-title { font-size: 20px; font-weight: 700; color: '#2D1B38'; }
.tm-modal-subtitle { font-size: 13px; color: '#9B6EA0'; margin-top: 3px; }
.tm-modal-close { background: rgba(98,48,104,0.1); border: none; width: 34px; height: 34px; border-radius: 9px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #623068; transition: all 0.15s ease; flex-shrink: 0; }
.tm-modal-close:hover { background: rgba(98,48,104,0.2); }
.tm-modal-body { padding: 24px 28px; }
.tm-form-section-title { font-size: 14px; font-weight: 700; color: '#2D1B38'; margin-bottom: 18px; display: flex; align-items: center; gap: 8px; }
.tm-form-section-title::after { content: ''; flex: 1; height: 1px; background: rgba(98,48,104,0.15); }
.tm-form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.tm-form-group { display: flex; flex-direction: column; }
.tm-form-label { font-size: 12px; font-weight: 600; color: '#47234F; margin-bottom: 6px; display: flex; align-items: center; gap: 3px; }
.tm-form-label .tm-required { color: '#8A1C37'; }
.tm-form-input, .tm-form-select { width: 100%; padding: 10px 14px; font-size: 13px; color: '#2D1B38; background: #ffffff; border: 1.5px solid rgba(98,48,104,0.2); border-radius: 10px; outline: none; transition: border-color 0.15s ease, box-shadow 0.15s ease; font-family: inherit; box-sizing: border-box; }
.tm-form-input:focus, .tm-form-select:focus { border-color: #0D7289; box-shadow: 0 0 0 3px rgba(13,114,137,0.1); background: #ffffff; }
.tm-form-input::placeholder { color: #9B6EA0; }
.tm-form-input.tm-error, .tm-form-select.tm-error { border-color: #8A1C37; }
.tm-form-error { font-size: 11px; color: #8A1C37; margin-top: 4px; font-weight: 500; }
.tm-form-select { appearance: none; cursor: pointer; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23623068' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 32px; }
.tm-time-input-group { display: flex; align-items: center; gap: 8px; }
.tm-time-input-group svg { color: #623068; flex-shrink: 0; }
.tm-time-input-group .tm-form-input { flex: 1; }
.tm-time-hint { font-size: 10px; color: #9B6EA0; margin-top: 4px; }
.tm-modal-footer { padding: 0 28px 28px; display: flex; gap: 12px; justify-content: flex-end; }
.tm-btn-cancel { padding: 10px 24px; font-size: 13px; font-weight: 600; color: '#47234F; background: #ede4ee; border: 1px solid rgba(98,48,104,0.2); border-radius: 10px; cursor: pointer; transition: all 0.15s ease; font-family: inherit; }
.tm-btn-cancel:hover { background: #d8c8dc; color: #2D1B38; }
.tm-btn-submit { padding: 10px 28px; font-size: 13px; font-weight: 600; color: '#F0EAF8'; background: linear-gradient(90deg, #623068 0%, #0D7289 100%); border: none; border-radius: 10px; cursor: pointer; transition: all 0.15s ease; font-family: inherit; display: inline-flex; align-items: center; gap: 6px; }
.tm-btn-submit:hover { background: linear-gradient(90deg, #47234F 0%, #0a5a6e 100%); box-shadow: 0 4px 12px rgba(98,48,104,0.3); }
.tm-btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }
.tm-info-box { margin: 20px 28px 0; padding: 14px 18px; background: linear-gradient(135deg, rgba(13,114,137,0.08) 0%, rgba(13,114,137,0.15) 100%); border: 1px solid rgba(13,114,137,0.25); border-radius: 10px; }
.tm-info-box-title { font-size: 13px; font-weight: 700; color: '#0D7289'; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
.tm-info-box ul { margin: 0; padding-left: 16px; font-size: 12px; line-height: 1.7; }
.tm-info-box li { color: #0a5a6e; }
.tm-toast { position: fixed; top: 24px; right: 24px; z-index: 1000; padding: 14px 20px; border-radius: 12px; font-size: 13px; font-weight: 500; background: #F5F0E5; border: 1px solid rgba(98,48,104,0.2); box-shadow: 0 8px 32px rgba(26,18,40,0.15); display: flex; align-items: center; gap: 10px; animation: tmToastIn 0.35s ease-out; }
.tm-toast.success { border-left: 4px solid #0D7289; }
.tm-toast.error   { border-left: 4px solid #8A1C37; }
.tm-toast.warning { border-left: 4px solid #C0854A; }
@keyframes tmToastIn { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
.tm-delete-overlay { position: fixed; inset: 0; z-index: 950; background: rgba(26,18,40,0.55); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; animation: tmFadeIn 0.2s ease; }
.tm-delete-box { background: #F5F0E5; border-radius: 16px; width: 380px; max-width: 90vw; padding: 28px; box-shadow: 0 20px 60px rgba(26,18,40,0.35); animation: tmModalIn 0.3s ease-out; text-align: center; border: 1px solid rgba(98,48,104,0.15); }
.tm-delete-icon { width: 52px; height: 52px; border-radius: 50%; background: #fde8ed; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
.tm-delete-title { font-size: 17px; font-weight: 700; color: '#2D1B38'; margin-bottom: 6px; }
.tm-delete-text { font-size: 13px; color: '#47234F'; margin-bottom: 22px; line-height: 1.5; }
.tm-delete-actions { display: flex; gap: 10px; }
.tm-delete-actions button { flex: 1; padding: 10px; font-size: 13px; font-weight: 600; border-radius: 10px; cursor: pointer; transition: all 0.15s ease; font-family: inherit; }
.tm-delete-cancel { background: #ede4ee; border: 1px solid rgba(98,48,104,0.2); color: '#47234F; }
.tm-delete-cancel:hover { background: #d8c8dc; }
.tm-delete-confirm { background: #8A1C37; border: none; color: '#F0EAF8; }
.tm-delete-confirm:hover { background: #6e1530; }
.tm-leave-confirm-overlay { position: fixed; inset: 0; z-index: 950; background: rgba(26,18,40,0.55); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; animation: tmFadeIn 0.2s ease; }
.tm-leave-confirm-box { background: #F5F0E5; border-radius: 16px; width: 420px; max-width: 90vw; padding: 28px; box-shadow: 0 20px 60px rgba(26,18,40,0.35); animation: tmModalIn 0.3s ease-out; text-align: center; border: 1px solid rgba(192,133,74,0.25); }
.tm-leave-confirm-icon { width: 52px; height: 52px; border-radius: 50%; background: #fef3e2; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px; }
.tm-leave-confirm-title { font-size: 17px; font-weight: 700; color: '#2D1B38'; margin-bottom: 6px; }
.tm-leave-confirm-text { font-size: 13px; color: '#47234F'; margin-bottom: 18px; line-height: 1.5; }
.tm-leave-days-group { display: flex; align-items: center; gap: 10px; margin-bottom: 22px; justify-content: center; }
.tm-leave-days-group label { font-size: 13px; font-weight: 600; color: '#47234F; white-space: nowrap; }
.tm-leave-days-input { width: 80px; padding: 8px 12px; font-size: 14px; font-weight: 700; text-align: center; color: #C0854A; background: #fef3e2; border: 1px solid rgba(192,133,74,0.4); border-radius: 8px; outline: none; font-family: inherit; }
.tm-leave-days-input:focus { border-color: #C0854A; box-shadow: 0 0 0 3px rgba(192,133,74,0.12); }
.tm-leave-days-group span { font-size: 13px; color: '#9B6EA0; }
.tm-leave-confirm-actions { display: flex; gap: 10px; }
.tm-leave-confirm-actions button { flex: 1; padding: 10px; font-size: 13px; font-weight: 600; border-radius: 10px; cursor: pointer; transition: all 0.15s ease; font-family: inherit; }
.tm-leave-confirm-cancel { background: #ede4ee; border: 1px solid rgba(98,48,104,0.2); color: '#47234F; }
.tm-leave-confirm-cancel:hover { background: #d8c8dc; }
.tm-leave-confirm-approve { background: #C0854A; border: none; color: '#F0EAF8'; }
.tm-leave-confirm-approve:hover { background: #a36b38; }
.tm-skeleton { background: linear-gradient(90deg, #e4d8e8 25%, #d8c8dc 50%, #e4d8e8 75%); background-size: 200% 100%; border-radius: 8px; animation: tmSkelPulse 1.4s ease-in-out infinite; }
@keyframes tmSkelPulse { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.tm-skel-header { display: flex; justify-content: space-between; margin-bottom: 28px; }
.tm-skel-title { width: 120px; height: 24px; }
.tm-skel-subtitle { width: 220px; height: 14px; margin-top: 8px; }
.tm-skel-btn { width: 160px; height: 40px; border-radius: 10px; }
.tm-skel-chips { display: flex; gap: 12px; margin-bottom: 24px; }
.tm-skel-chip { width: 120px; height: 42px; border-radius: 10px; }
.tm-skel-bar { height: 44px; border-radius: 10px; margin-bottom: 22px; }
.tm-skel-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 18px; }
.tm-skel-card { height: 300px; border-radius: 14px; }
@media (max-width: 768px) {
    .tm-filter-bar { flex-direction: column; align-items: stretch; }
    .tm-search-box { max-width: 100%; }
    .tm-filter-tabs { overflow-x: auto; }
    .tm-cards-grid { grid-template-columns: 1fr; }
    .tm-form-grid { grid-template-columns: 1fr; }
    .tm-modal-box { margin-top: 20px; }
}
`;

if (typeof document !== 'undefined' && !document.getElementById('emp-tm-styles')) {
    const tag = document.createElement('style');
    tag.id = 'emp-tm-styles';
    tag.textContent = styles;
    document.head.appendChild(tag);
}

// Helper function to upload image to Firebase Storage (Chor diya hai taake images work karein)
const uploadImageToStorage = async (imageDataUrl, fileName) => {
    try {
        const storageRef = ref(storage, `employee-images/${fileName}`);
        await uploadString(storageRef, imageDataUrl, 'data_url');
        const downloadURL = await getDownloadURL(storageRef);
        return downloadURL;
    } catch (error) {
        console.error('Error uploading image:', error);
        return null;
    }
};

// Helper function to delete image from Firebase Storage
const deleteImageFromStorage = async (imageUrl) => {
    if (!imageUrl || !imageUrl.includes('firebasestorage')) return;
    try {
        const imageRef = ref(storage, imageUrl);
        await deleteObject(imageRef);
    } catch (error) {
        console.error('Error deleting image:', error);
    }
};

const Employees = ({ onNavigate }) => {
    const [team, setTeam] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterDept, setFilterDept] = useState('All');
    const [filterStatus, setFilterStatus] = useState('All');
    const [modalOpen, setModalOpen] = useState(false);
    const [editModal, setEditModal] = useState(null);
    const [deleteModal, setDeleteModal] = useState(null);
    const [leaveModal, setLeaveModal] = useState(null);
    const [leaveDays, setLeaveDays] = useState(1);
    const [toast, setToast] = useState(null);
    
    const [form, setForm] = useState({
        name: '', email: '', phone: '', type: 'Full Time', role: '', rank: '',
        department: '', location: '', checkInTime: '09:00', checkOutTime: '17:30',
        education: '', institute: '', profilePic: null
    });
    const [editForm, setEditForm] = useState({});
    const [errors, setErrors] = useState({});
    const [editErrors, setEditErrors] = useState({});
    const [submitting, setSubmitting] = useState(false);
    const [editSubmitting, setEditSubmitting] = useState(false);

    // Token ko get karne ka function (as requested)
    const token = localStorage.getItem('userToken') || import.meta.env.VITE_HF_TOKEN;
    const API_URL = import.meta.env.VITE_BACKEND_URL;

    // 1. Fetch Employees (GET Request with Token)
    const fetchEmployees = useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/employees`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch employees');
            }

            const data = await response.json();
            setTeam(data);
        } catch (error) {
            console.error("Error fetching employees:", error);
            showToast('Failed to load employees', 'error');
        } finally {
            setLoading(false);
        }
    }, [API_URL, token]); // Dependencies

    useEffect(() => {
        fetchEmployees();
    }, [fetchEmployees]);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    const deptStats = useMemo(() => {
        const counts = {};
        team.forEach(m => { counts[m.department] = (counts[m.department] || 0) + 1; });
        return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([dept, count]) => ({ dept, count }));
    }, [team]);

    const allDepts = useMemo(() => {
        const set = new Set(team.map(m => m.department));
        return ['All', ...Array.from(set)];
    }, [team]);

    const statusTabs = useMemo(() => {
        const counts = { All: team.length, Active: 0, 'On Leave': 0 };
        team.forEach(m => { if (counts[m.status] !== undefined) counts[m.status]++; });
        return counts;
    }, [team]);

    const filteredTeam = useMemo(() => {
        return team.filter(m => {
            const matchSearch = !search || m.name?.toLowerCase().includes(search.toLowerCase()) || m.role?.toLowerCase().includes(search.toLowerCase()) || m.email?.toLowerCase().includes(search.toLowerCase());
            const matchDept = filterDept === 'All' || m.department === filterDept;
            const matchStatus = filterStatus === 'All' || m.status === filterStatus;
            return matchSearch && matchDept && matchStatus;
        });
    }, [team, search, filterDept, filterStatus]);

    // 2. Leave Toggle Function (using PUT)
    const handleLeaveToggle = async (member) => {
        if (member.status === 'On Leave') {
            try {
                // Remove leave status
                const response = await fetch(`${API_URL}/employees/${member.id}`, {
                    method: 'PUT', // Ya PATCH, jaisa backend support kare
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        status: 'Active', 
                        leaveDays: null 
                    })
                });
                
                if (response.ok) {
                    // Update local state
                    setTeam(prev => prev.map(m => 
                        m.id === member.id ? { ...m, status: 'Active', leaveDays: null } : m
                    ));
                    showToast(`${member.name} is back — marked as Active`, 'success');
                } else {
                    throw new Error('Failed to update status');
                }
            } catch (e) { 
                console.error('Error removing leave:', e);
                showToast('Failed to update status', 'error'); 
            }
        } else { 
            setLeaveModal(member); 
            setLeaveDays(1); 
        }
    };

    const confirmLeave = async () => {
        if (!leaveModal) {
            showToast('No employee selected', 'error');
            return;
        }
        
        const days = Math.max(1, parseInt(leaveDays) || 1);
        
        try {
            const response = await fetch(`${API_URL}/employees/${leaveModal.id}`, {
                method: 'PUT', 
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    status: 'On Leave', 
                    leaveDays: days 
                })
            });

            if (response.ok) {
                setTeam(prev => prev.map(m => 
                    m.id === leaveModal.id ? { ...m, status: 'On Leave', leaveDays: days } : m
                ));
                showToast(`${leaveModal.name} marked on leave for ${days} day${days > 1 ? 's' : ''}`, 'warning');
                setLeaveModal(null);
                setLeaveDays(1);
            } else {
                throw new Error('Failed to approve leave');
            }
        } catch (error) {
            console.error('Leave approval error:', error);
            showToast('Failed to approve leave', 'error');
        }
    };

    const updateForm = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors(prev => ({ ...prev, [field]: null }));
    };

    const updateEditForm = (field, value) => {
        setEditForm(prev => ({ ...prev, [field]: value }));
        if (editErrors[field]) setEditErrors(prev => ({ ...prev, [field]: null }));
    };

    const validate = (f, setErr) => {
        const e = {};
        if (!f.name?.trim()) e.name = 'Full name is required';
        if (!f.email?.trim()) e.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(f.email)) e.email = 'Invalid email format';
        if (!f.role) e.role = 'Role is required';
        if (!f.rank) e.rank = 'Rank is required';
        if (!f.department) e.department = 'Department is required';
        if (!f.checkInTime) e.checkInTime = 'Check-in time is required';
        if (!f.checkOutTime) e.checkOutTime = 'Check-out time is required';
        setErr(e);
        return Object.keys(e).length === 0;
    };

    const openEditModal = (member) => {
        setEditForm({
            name: member.name || '',
            email: member.email || '',
            phone: member.phone || '',
            type: member.type || 'Full Time',
            role: member.role || '',
            rank: member.rank || '',
            department: member.department || '',
            location: member.location || '',
            checkInTime: member.checkInTime || '09:00',
            checkOutTime: member.checkOutTime || '17:30',
            education: member.education || '',
            institute: member.institute || '',
            profilePic: member.profilePic || null,
            avatarColor: member.avatarColor || pickColor(),
            existingProfilePic: member.profilePic || null
        });
        setEditErrors({});
        setEditModal(member);
    };

    const handleEditPicUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { 
            showToast('Image size should be less than 2MB', 'error'); 
            return; 
        }
        const reader = new FileReader();
        reader.onload = (ev) => updateEditForm('profilePic', ev.target.result);
        reader.readAsDataURL(file);
    };

    // 3. Handle Edit Submit (PUT Request with Token)
    const handleEditSubmit = async () => {
        if (!validate(editForm, setEditErrors)) return;
        setEditSubmitting(true);

        let profilePicUrl = editForm.existingProfilePic || null;
        
        // Image upload logic (Firebase Storage)
        if (editForm.profilePic && editForm.profilePic !== editForm.existingProfilePic) {
            const fileName = `${editModal.id}_${Date.now()}.jpg`;
            const uploadedUrl = await uploadImageToStorage(editForm.profilePic, fileName);
            if (uploadedUrl) {
                if (editForm.existingProfilePic) {
                    await deleteImageFromStorage(editForm.existingProfilePic);
                }
                profilePicUrl = uploadedUrl;
            }
        } else if (editForm.profilePic === null && editForm.existingProfilePic) {
            await deleteImageFromStorage(editForm.existingProfilePic);
            profilePicUrl = null;
        }

        const updatedData = {
            name: editForm.name.trim(),
            email: editForm.email.trim(),
            phone: editForm.phone ? editForm.phone.trim() : '',
            type: editForm.type,
            role: editForm.role,
            education: editForm.education || '',
            institute: editForm.institute || '',
            rank: editForm.rank,
            department: editForm.department,
            location: editForm.location || 'Remote',
            avatar: profilePicUrl ? null : getInitials(editForm.name),
            avatarColor: editForm.avatarColor,
            profilePic: profilePicUrl,
            checkInTime: editForm.checkInTime,
            checkOutTime: editForm.checkOutTime,
            lastUpdated: new Date()
        };

        try {
            const response = await fetch(`${API_URL}/employees/${editModal.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updatedData)
            });

            if (response.ok) {
                setTeam(prev => prev.map(m => m.id === editModal.id ? { ...m, ...updatedData } : m));
                showToast(`${updatedData.name} updated successfully`, 'success');
                setEditModal(null);
            } else {
                throw new Error('Failed to update employee');
            }
        } catch (error) {
            console.error('Update error fully:', error);
            showToast('Failed to update member', 'error');
        } finally {
            setEditSubmitting(false);
        }
    };

    // 4. Handle Submit (POST Request with Token)
    const handleSubmit = async () => {
        if (!validate(form, setErrors)) return;
        setSubmitting(true);
        const newId = generateId();
        
        let profilePicUrl = null;
        if (form.profilePic) {
            const fileName = `${newId}_${Date.now()}.jpg`;
            profilePicUrl = await uploadImageToStorage(form.profilePic, fileName);
        }
        
        const memberData = {
            id: newId, 
            name: form.name.trim(), 
            email: form.email.trim(),
            phone: form.phone ? form.phone.trim() : '', 
            type: form.type, 
            role: form.role,
            education: form.education || '', 
            institute: form.institute || '',
            rank: form.rank, 
            department: form.department, 
            location: form.location || 'Remote',
            status: 'Active', 
            avatar: profilePicUrl ? null : getInitials(form.name),
            avatarColor: pickColor(), 
            profilePic: profilePicUrl,
            projects: [], 
            performance: 0, 
            skills: [],
            checkInTime: form.checkInTime || '09:00', 
            checkOutTime: form.checkOutTime || '17:30'
        };
        
        try {
            const response = await fetch(`${API_URL}/employees`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(memberData)
            });

            if (response.ok) {
                showToast(`${memberData.name} added to team`, 'success');
                resetForm(); 
                setModalOpen(false); 
                fetchEmployees(); // Refresh list
            } else {
                throw new Error('Failed to add employee');
            }
        } catch (error) { 
            console.error('Add error:', error);
            showToast('Failed to add employee', 'error'); 
        } finally { 
            setSubmitting(false); 
        }
    };

    // 5. Handle Delete (DELETE Request with Token)
    const handleDelete = async (id) => {
        const member = team.find(m => m.id === id);
        try {
            // Delete profile image if exists (Firebase Storage)
            if (member?.profilePic) {
                await deleteImageFromStorage(member.profilePic);
            }

            const response = await fetch(`${API_URL}/employees/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                setTeam(prev => prev.filter(m => m.id !== id)); 
                showToast(`${member?.name || 'Employee'} removed`, 'error'); 
                setDeleteModal(null);
            } else {
                throw new Error('Failed to remove employee');
            }
        } catch (error) { 
            console.error('Delete error:', error);
            showToast('Failed to remove employee', 'error'); 
        }
    };

    const resetForm = () => {
        setForm({ name: '', email: '', phone: '', type: 'Full Time', role: '', rank: '', department: '', location: '', checkInTime: '09:00', checkOutTime: '17:30', education: '', institute: '', profilePic: null });
        setErrors({});
    };

    const handlePicUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { 
            showToast('Image size should be less than 2MB', 'error'); 
            return; 
        }
        const reader = new FileReader();
        reader.onload = (ev) => updateForm('profilePic', ev.target.result);
        reader.readAsDataURL(file);
    };

    const renderFormFields = (f, upd, errs, picInputId, onPicUpload, isEdit = false) => (
        <div className="tm-form-grid">
            <div className="tm-pic-upload-wrap">
                <label className="tm-form-label">Profile Picture</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                    <div className="tm-pic-preview" style={{ backgroundColor: f.profilePic ? 'transparent' : '#623068' }}
                        onClick={() => document.getElementById(picInputId).click()}>
                        {f.profilePic ? <img src={f.profilePic} alt="profile" /> : getInitials(f.name || 'TM')}
                    </div>
                    <div>
                        <input id={picInputId} type="file" accept="image/*" style={{ display: 'none' }} onChange={onPicUpload} />
                        <button type="button" className="tm-btn-cancel" style={{ fontSize: 12, padding: '6px 14px' }}
                            onClick={() => document.getElementById(picInputId).click()}>📁 Upload Photo</button>
                        {f.profilePic && (
                            <button type="button" className="tm-card-action-btn tm-action-delete"
                                style={{ fontSize: 12, padding: '6px 14px', marginLeft: 8 }}
                                onClick={() => upd('profilePic', null)}>Remove</button>
                        )}
                        <p style={{ fontSize: 11, color: '#9B6EA0', marginTop: 6 }}>JPG, PNG, WEBP — max 2MB</p>
                    </div>
                </div>
            </div>
            <div className="tm-form-group">
                <label className="tm-form-label">Full Name <span className="tm-required">*</span></label>
                <input className={`tm-form-input${errs.name ? ' tm-error' : ''}`} type="text" placeholder="e.g. Ali Hassan" value={f.name || ''} onChange={e => upd('name', e.target.value)} />
                {errs.name && <span className="tm-form-error">{errs.name}</span>}
            </div>
            <div className="tm-form-group">
                <label className="tm-form-label">Email Address <span className="tm-required">*</span></label>
                <input className={`tm-form-input${errs.email ? ' tm-error' : ''}`} type="email" placeholder="e.g. ali@company.com" value={f.email || ''} onChange={e => upd('email', e.target.value)} />
                {errs.email && <span className="tm-form-error">{errs.email}</span>}
            </div>
            <div className="tm-form-group">
                <label className="tm-form-label">Phone Number</label>
                <input className="tm-form-input" type="tel" placeholder="+92 3XX XXXXXXX" value={f.phone || ''} onChange={e => upd('phone', e.target.value)} />
            </div>
            <div className="tm-form-group">
                <label className="tm-form-label">Education</label>
                <input className="tm-form-input" type="text" placeholder="e.g. BS Computer Science" value={f.education || ''} onChange={e => upd('education', e.target.value)} />
            </div>
            <div className="tm-form-group">
                <label className="tm-form-label">Institute Name</label>
                <input className="tm-form-input" type="text" placeholder="e.g. FAST NUCES" value={f.institute || ''} onChange={e => upd('institute', e.target.value)} />
            </div>
             <div className="tm-form-group">
                <label className="tm-form-label">Location</label>
                <input className="tm-form-input" type="text"  placeholder="FSD" value={f.location || ''} onChange={e => upd('location', e.target.value)}/>     
            </div>
                <div className="tm-form-group">
    <label className="tm-form-label">Department <span className="tm-required">*</span></label>
    <input 
        type="text"
        className={`tm-form-input${errs.department ? ' tm-error' : ''}`} 
        placeholder="Enter department name..."
        value={f.department || ''} 
        onChange={e => upd('department', e.target.value)} 
    />

    {errs.department && <span className="tm-form-error">{errs.department}</span>}
</div>
         
            <div className="tm-form-group">
                <label className="tm-form-label">Employee Type</label>
                <select className="tm-form-select" value={f.type || 'Full Time'} onChange={e => upd('type', e.target.value)}>
                    {EMP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>
            
            <div className="tm-form-group">
    <label className="tm-form-label">Role <span className="tm-required">*</span></label>
    <input 
        type="text"
        placeholder="Enter role (e.g. Developer, Designer)"
        className={`tm-form-input${errs.role ? ' tm-error' : ''}`} 
        value={f.role || ''} 
        onChange={e => upd('role', e.target.value)} 
    />
    {errs.role && <span className="tm-form-error">{errs.role}</span>}
</div>
            <div className="tm-form-group">
                <label className="tm-form-label">Rank <span className="tm-required">*</span></label>
                <select className={`tm-form-select${errs.rank ? ' tm-error' : ''}`} value={f.rank || ''} onChange={e => upd('rank', e.target.value)}>
                    <option value="">Select rank...</option>
                    {RANKS.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
                {errs.rank && <span className="tm-form-error">{errs.rank}</span>}
            </div>
            
            
            <div className="tm-form-group">
                <label className="tm-form-label">Check-in Time <span className="tm-required">*</span></label>
                <div className="tm-time-input-group">
                    <Icon type="clock" size={15} />
                    <input className={`tm-form-input${errs.checkInTime ? ' tm-error' : ''}`} type="time" value={f.checkInTime || '09:00'} onChange={e => upd('checkInTime', e.target.value)} />
                </div>
                <div className="tm-time-hint">Scheduled check-in time</div>
                {errs.checkInTime && <span className="tm-form-error">{errs.checkInTime}</span>}
            </div>
            <div className="tm-form-group">
                <label className="tm-form-label">Check-out Time <span className="tm-required">*</span></label>
                <div className="tm-time-input-group">
                    <Icon type="clock" size={15} />
                    <input className={`tm-form-input${errs.checkOutTime ? ' tm-error' : ''}`} type="time" value={f.checkOutTime || '17:30'} onChange={e => upd('checkOutTime', e.target.value)} />
                </div>
                <div className="tm-time-hint">Scheduled check-out time</div>
                {errs.checkOutTime && <span className="tm-form-error">{errs.checkOutTime}</span>}
            </div>
        </div>
    );

    if (loading) {
        return (
            <PageWrapper pageId="employees" pageLabel="Employees" description="Manage your team members" onNavigate={onNavigate}>
                <div className="tm-skel-header">
                    <div><div className="tm-skeleton tm-skel-title"></div><div className="tm-skeleton tm-skel-subtitle"></div></div>
                    <div className="tm-skeleton tm-skel-btn"></div>
                </div>
                <div className="tm-skel-chips">{[1,2,3,4].map(i => <div key={i} className="tm-skeleton tm-skel-chip"></div>)}</div>
                <div className="tm-skeleton tm-skel-bar"></div>
                <div className="tm-skel-grid">{[1,2,3,4,5,6].map(i => <div key={i} className="tm-skeleton tm-skel-card"></div>)}</div>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper pageId="employees" pageLabel="Employees" description="Manage your team members" onNavigate={onNavigate}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#2D1B38' }}>All Employees ({team.length})</h3>
                <button
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 22px', background: 'linear-gradient(90deg, #623068 0%, #0D7289 100%)', color: '#F0EAF8', border: 'none', borderRadius: 10, fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.2s ease', boxShadow: '0 2px 8px rgba(98,48,104,0.3)' }}
                    onClick={() => { resetForm(); setModalOpen(true); }}
                >
                    <Icon type="plus" size={16} color="#F0EAF8" />
                    Add New Member
                </button>
            </div>

            {/* Department Stats */}
            <div className="tm-dept-stats">
                {deptStats.map(d => {
                    const dc = DEPT_COLORS[d.dept] || { bg: '#F5F0E5', color: '#47234F', icon: '#9B6EA0' };
                    return (
                        <div className="tm-dept-chip" key={d.dept}>
                            <div className="tm-dept-icon" style={{ backgroundColor: dc.bg, color: dc.icon }}><Icon type="building" size={15} /></div>
                            <span className="tm-dept-name">{d.dept}</span>
                            <span className="tm-dept-count">{d.count}</span>
                        </div>
                    );
                })}
            </div>

            {/* Search & Filter */}
            <div className="tm-filter-bar">
                <div className="tm-search-box">
                    <Icon type="search" size={16} />
                    <input type="text" placeholder="Search by name, role, or email..." value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className="tm-filter-tabs">
                    {Object.entries(statusTabs).map(([label, count]) => (
                        <button key={label} className={`tm-filter-tab${filterStatus === label ? ' active' : ''}`} onClick={() => setFilterStatus(label)}>{label} ({count})</button>
                    ))}
                </div>
                <div className="tm-filter-tabs">
                    {allDepts.map(dept => (
                        <button key={dept} className={`tm-filter-tab${filterDept === dept ? ' active' : ''}`} onClick={() => setFilterDept(dept)}>{dept}</button>
                    ))}
                </div>
            </div>

            {/* Employee Cards */}
            {filteredTeam.length === 0 ? (
                <div className="tm-no-results">
                    <Icon type="search" size={48} />
                    <h3>No team members found</h3>
                    <p>Try adjusting your search or filter criteria</p>
                </div>
            ) : (
                <div className="tm-cards-grid">
                    {filteredTeam.map(member => {
                        const ss = getStatusStyle(member.status);
                        const pc = getPerformanceColor(member.performance || 0);
                        const isOnLeave = member.status === 'On Leave';
                        return (
                            <div className={`tm-emp-card${isOnLeave ? ' tm-on-leave' : ''}`} key={member.id}>
                                <div className="tm-leave-stripe"></div>
                                <div className="tm-card-top">
                                    <div className="tm-card-emp-info">
                                        <div className="tm-card-avatar" style={{ backgroundColor: (member.profilePic && member.profilePic !== '' && member.profilePic !== 'null') ? 'transparent' : (member.avatarColor || '#623068') }}>
                                            {(member.profilePic && member.profilePic !== '' && member.profilePic !== 'null')
                                                ? <img src={member.profilePic} alt={member.name} onError={e => { e.target.style.display='none'; }} />
                                                : (member.avatar || (member.name ? member.name.charAt(0).toUpperCase() : 'E'))
                                            }
                                        </div>
                                        <div className="tm-card-name-wrap">
                                            <span className="tm-card-name">{member.name}</span>
                                            <span className="tm-card-role">{member.role}</span>
                                            <div className="tm-checkin-badge">
                                                <Icon type={isOnLeave ? 'calendar-off' : 'clock'} size={10} />
                                                {isOnLeave ? 'On Leave' : `${member.checkInTime || '09:00'} — ${member.checkOutTime || '17:30'}`}
                                            </div>
                                        </div>
                                    </div>
                                    <span className="tm-status-badge" style={{ background: ss.bg, color: ss.color }}>
                                        <span className="tm-status-dot" style={{ backgroundColor: ss.dot }}></span>{member.status}
                                    </span>
                                </div>

                                <div className="tm-card-body">
                                    <div className="tm-card-contact">
                                        <div className="tm-contact-row"><Icon type="mail" size={13} /><span>{member.email}</span></div>
                                        <div className="tm-contact-row"><span style={{ fontSize: '16px', color: '#C0854A' }}>◈</span><span>{member.role}</span></div>
                                        <div className="tm-contact-row"><Icon type="phone" size={13} /><span>{member.phone || '—'}</span></div>
                                        <div className="tm-contact-row">
                                            <GraduationCap size={16} style={{ marginRight: '4px', color: '#9B6EA0', flexShrink: 0 }} />
                                            <span>{member.education || '—'}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="tm-card-divider"></div>

                                <div className="tm-card-stats">
                                    <div className="tm-stat-item">
                                        <span className="tm-stat-label"><Icon type="folder" size={12} /> Projects</span>
                                        <span className="tm-stat-value">{Array.isArray(member.projects) ? member.projects.length : (member.projects || 0)}</span>
                                    </div>
                                    <div className="tm-stat-item">
                                        <span className="tm-stat-label"><Icon type="award" size={12} /> Performance</span>
                                        <span className="tm-stat-value" style={{ color: pc }}>{member.performance || 0}%</span>
                                        <div className="tm-perf-bar-track"><div className="tm-perf-bar-fill" style={{ width: `${member.performance || 0}%`, backgroundColor: pc }} /></div>
                                        <span className="tm-perf-label" style={{ color: pc }}>{getPerformanceLabel(member.performance || 0)}</span>
                                    </div>
                                </div>

                                {member.skills && member.skills.length > 0 && (
                                    <><div className="tm-card-divider"></div>
                                    <div className="tm-card-footer"><div className="tm-skills-wrap">{member.skills.map(s => <span className="tm-skill-tag" key={s}>{s}</span>)}</div></div></>
                                )}

                                {/* Leave Toggle */}
                                <div className="tm-card-leave-section">
                                    <div className="tm-leave-toggle-wrap">
                                        <span className={`tm-leave-toggle-label${isOnLeave ? ' tm-active' : ''}`}>
                                            <Icon type="leave" size={14} />{isOnLeave ? 'On Leave' : 'Mark Leave'}
                                        </span>
                                        <label className="tm-leave-toggle">
                                            <input type="checkbox" checked={isOnLeave} onChange={() => handleLeaveToggle(member)} />
                                            <span className="tm-leave-track"></span>
                                            <span className="tm-leave-thumb"></span>
                                        </label>
                                    </div>
                                    {member.leaveDays && (
                                        <div className="tm-leave-duration tm-active">
                                            <Icon type="calendar-off" size={11} />{member.leaveDays} day{member.leaveDays >1 ? 's' : ''}
                                        </div>
                                    )}
                                </div>

                                <div className="tm-card-actions">
                                    <button className="tm-card-action-btn tm-action-edit" onClick={() => openEditModal(member)}>
                                        <Icon type="edit" size={12} /> Edit
                                    </button>
                                    <button className="tm-card-action-btn tm-action-delete" onClick={() => setDeleteModal(member)}>
                                        <Icon type="trash" size={12} /> Remove
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ADD MODAL */}
            {modalOpen && (
                <div className="tm-modal-overlay" onClick={() => setModalOpen(false)}>
                    <div className="tm-modal-box" onClick={e => e.stopPropagation()}>
                        <div className="tm-modal-header">
                            <div>
                                <div className="tm-modal-title">Add New Team Member</div>
                                <div className="tm-modal-subtitle">Add a new employee to your team</div>
                            </div>
                            <button className="tm-modal-close" onClick={() => setModalOpen(false)}><Icon type="close" size={16} /></button>
                        </div>
                        <div className="tm-modal-body">
                            <div className="tm-form-section-title">Employee Information</div>
                            {renderFormFields(form, updateForm, errors, 'emp-pic-add-input', handlePicUpload)}
                        </div>
                        <div className="tm-info-box">
                            <div className="tm-info-box-title"><Icon type="info" size={15} color="#0D7289" /> Adding Team Members</div>
                            <ul><li>All fields marked with * are required</li><li>New member will be saved to Backend</li><li>Check-in/Check-out times appear in Attendance page</li></ul>
                        </div>
                        <div className="tm-modal-footer">
                            <button className="tm-btn-cancel" onClick={() => setModalOpen(false)}>Cancel</button>
                            <button className="tm-btn-submit" onClick={handleSubmit} disabled={submitting}>
                                {submitting ? 'Adding...' : <><Icon type="plus" size={14} color="#F0EAF8" /> Add Employee</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT MODAL */}
            {editModal && (
                <div className="tm-modal-overlay" onClick={() => setEditModal(null)}>
                    <div className="tm-modal-box" onClick={e => e.stopPropagation()}>
                        <div className="tm-modal-header">
                            <div>
                                <div className="tm-modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <Icon type="edit" size={20} color="#0D7289" />
                                    Edit Employee
                                </div>
                                <div className="tm-modal-subtitle">Editing: <strong style={{ color: '#2D1B38' }}>{editModal.name}</strong></div>
                            </div>
                            <button className="tm-modal-close" onClick={() => setEditModal(null)}><Icon type="close" size={16} /></button>
                        </div>
                        <div className="tm-modal-body">
                            <div className="tm-form-section-title">Employee Information</div>
                            {renderFormFields(editForm, updateEditForm, editErrors, 'emp-pic-edit-input', handleEditPicUpload)}
                        </div>
                        <div className="tm-info-box">
                            <div className="tm-info-box-title"><Icon type="info" size={15} color="#0D7289" /> Editing Employee</div>
                            <ul><li>All fields marked with * are required</li><li>Changes will be saved to Backend immediately</li></ul>
                        </div>
                        <div className="tm-modal-footer">
                            <button className="tm-btn-cancel" onClick={() => setEditModal(null)}>Cancel</button>
                            <button className="tm-btn-submit" onClick={handleEditSubmit} disabled={editSubmitting}>
                                {editSubmitting ? 'Saving...' : <><Icon type="check" size={14} color="#F0EAF8" /> Save Changes</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* LEAVE CONFIRM */}
            {leaveModal && (
                <div className="tm-leave-confirm-overlay" onClick={() => setLeaveModal(null)}>
                    <div className="tm-leave-confirm-box" onClick={e => e.stopPropagation()}>
                        <div className="tm-leave-confirm-icon"><Icon type="leave" size={22} color="#C0854A" /></div>
                        <div className="tm-leave-confirm-title">Mark {leaveModal.name} On Leave</div>
                        <div className="tm-leave-confirm-text">This will update their status to <strong>On Leave</strong>.</div>
                        <div className="tm-leave-days-group">
                            <label>Duration:</label>
                            <input className="tm-leave-days-input" type="number" min="1" max="90" value={leaveDays} onChange={e => setLeaveDays(e.target.value)} />
                            <span>day{leaveDays >1 ? 's' : ''}</span>
                        </div>
                        <div className="tm-leave-confirm-actions">
                            <button className="tm-leave-confirm-cancel" onClick={() => setLeaveModal(null)}>Cancel</button>
                            <button className="tm-leave-confirm-approve" onClick={confirmLeave}>Approve Leave</button>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE CONFIRM */}
            {deleteModal && (
                <div className="tm-delete-overlay" onClick={() => setDeleteModal(null)}>
                    <div className="tm-delete-box" onClick={e => e.stopPropagation()}>
                        <div className="tm-delete-icon"><Icon type="trash" size={22} color="#8A1C37" /></div>
                        <div className="tm-delete-title">Remove Team Member</div>
                        <div className="tm-delete-text">Are you sure you want to remove <strong>{deleteModal.name}</strong>? This action cannot be undone.</div>
                        <div className="tm-delete-actions">
                            <button className="tm-delete-cancel" onClick={() => setDeleteModal(null)}>Cancel</button>
                            <button className="tm-delete-confirm" onClick={() => handleDelete(deleteModal.id)}>Remove</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className={`tm-toast ${toast.type}`}>
                    <Icon type={toast.type === 'success' ? 'check' : 'alert'} size={16} color={toast.type === 'success' ? '#0D7289' : toast.type === 'warning' ? '#C0854A' : '#8A1C37'} />
                    {toast.message}
                </div>
            )}
        </PageWrapper>
    );
};

export default Employees;