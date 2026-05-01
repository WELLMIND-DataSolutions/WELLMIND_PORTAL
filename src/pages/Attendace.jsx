import React, { useState, useEffect, useRef, useCallback } from 'react';
import Sidebar from '../Sidebar';
import { db } from "../firebase";
import { collection, getDocs, doc, setDoc, onSnapshot } from "firebase/firestore";

/* ── WellMind Brand Palette ─────────────────────────────── */
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

const dateId = new Date().toISOString().split("T")[0]; // e.g. "2025-04-30"

const formatCurrentTime = () =>
  new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

const loadJsPDF = () =>
  new Promise((resolve, reject) => {
    if (window.jspdf) { resolve(window.jspdf.jsPDF); return; }
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
    s.onload = () => {
      const at = document.createElement('script');
      at.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js';
      at.onload = () => resolve(window.jspdf.jsPDF);
      at.onerror = reject;
      document.head.appendChild(at);
    };
    s.onerror = reject;
    document.head.appendChild(s);
  });

const STATUS_COLORS = {
  Present: { bg: '#dcfce7', color: '#15803d' },
  Late:    { bg: '#fef3c7', color: '#b45309' },
  Absent:  { bg: '#fee2e2', color: BRAND.secondaryRed },
  Leave:   { bg: '#e0e7ff', color: BRAND.primaryPurple },
  Pending: { bg: '#f1f5f9', color: '#64748b' },
};

const Badge = ({ status }) => {
  const c = STATUS_COLORS[status] || STATUS_COLORS.Pending;
  return (
    <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700,
      background: c.bg, color: c.color, display: 'inline-block', letterSpacing: 0.3 }}>
      {status}
    </span>
  );
};

const addPdfFooter = (pdf, pageWidth) => {
  const n = pdf.internal.getNumberOfPages();
  for (let p = 1; p <= n; p++) {
    pdf.setPage(p);
    const ph = pdf.internal.pageSize.getHeight();
    pdf.setDrawColor(200, 180, 150);
    pdf.line(40, ph - 25, pageWidth - 40, ph - 25);
    pdf.setFontSize(8); pdf.setTextColor(100, 100, 100);
    pdf.text('WellMind Data Solutions – Official Attendance Record', 40, ph - 12);
    pdf.text(`Page ${p} of ${n}`, pageWidth - 40, ph - 12, { align: 'right' });
  }
};

const thStyle  = { padding: '14px 12px', fontSize: 12, color: BRAND.primaryMid, fontWeight: 700, textAlign: 'center', letterSpacing: 0.5 };
const tdStyle  = { padding: '14px 20px', fontSize: 14, color: BRAND.textMain };
const tdCenter = { padding: '14px 12px', textAlign: 'center', fontSize: 14, color: BRAND.textMain };

/* ════════════════════════════════════════════════════════════
   KEY FIX EXPLANATION:
   
   Problem tha: Firestore mein jab hum
   setDoc(doc(db, "attendance", "2025-04-30", "records", empId))
   karte hain, toh "attendance/2025-04-30" document AUTOMATICALLY
   nahi banta — sirf subcollection banti hai.
   
   Isliye getDocs(collection(db, "attendance")) se koi docs
   nahi milte the, aur monthly report empty thi.
   
   FIX: Hum ab date range generate karte hain khud (month ke
   saare din), aur har din ki "records" subcollection directly
   fetch karte hain — parent doc exist kare ya na kare.
════════════════════════════════════════════════════════════ */

// ── Helper: get all date strings for a given month ──────────
const getDatesInMonth = (yearMonth) => {
  // yearMonth = "2025-04"
  const [year, month] = yearMonth.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate(); // e.g. 30
  const dates = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dd = String(d).padStart(2, '0');
    const mm = String(month).padStart(2, '0');
    dates.push(`${year}-${mm}-${dd}`);
  }
  return dates;
};

/* ════════════════════════════════════════════════════════════
   Attendance Component
════════════════════════════════════════════════════════════ */
const Attendance = ({ onNavigate }) => {
  const [records, setRecords]           = useState([]);
  const [monthlyStats, setMonthlyStats] = useState({});
  const [dailyDetails, setDailyDetails] = useState({});
  const [view, setView]                 = useState('daily');
  const [selectedEmp, setSelectedEmp]   = useState(null);
  const [loading, setLoading]           = useState(true);
  const [currentTime, setCurrentTime]   = useState(formatCurrentTime());
  const [downloading, setDownloading]   = useState(false);
  const [personDl, setPersonDl]         = useState(false);
  const [reportMonth, setReportMonth]   = useState(new Date().toISOString().slice(0, 7));

  const recordsRef = useRef([]);
  useEffect(() => { recordsRef.current = records; }, [records]);

  /* Clock */
  useEffect(() => {
    const t = setInterval(() => setCurrentTime(formatCurrentTime()), 1000);
    return () => clearInterval(t);
  }, []);

  /* Init: load employees + real-time today listener */
  useEffect(() => {
    let unsub = () => {};
    const init = async () => {
      try {
        const snap = await getDocs(collection(db, "employees"));
        const initial = snap.docs.map(d => ({
          id: d.id, ...d.data(),
          scheduledIn: d.data().checkInTime || "09:00 AM",
          status: "Pending", checkIn: null,
        }));
        setRecords(initial);
        recordsRef.current = initial;

        // Real-time listener for today's attendance
        unsub = onSnapshot(collection(db, "attendance", dateId, "records"), s => {
          const updates = {};
          s.forEach(d => { updates[d.id] = d.data(); });
          setRecords(prev => prev.map(r => updates[r.id] ? { ...r, ...updates[r.id] } : r));
        });
      } catch (e) { console.error("Init error:", e); }
      finally { setLoading(false); }
    };
    init();
    return () => unsub();
  }, []);

  /* Mark attendance */
  const handleAttendance = async (empId, empScheduledIn, type) => {
    const nowStr = formatCurrentTime();
    let finalStatus = type;
    if (type === "Present") {
      const parseMin = t => {
        if (!t || !t.includes(' ')) return 0;
        const [time, mod] = t.split(' ');
        let [h, m] = time.split(':');
        if (h === '12') h = '0';
        return (parseInt(h) + (mod === 'PM' ? 12 : 0)) * 60 + parseInt(m);
      };
      if (parseMin(nowStr) > parseMin(empScheduledIn) + 5) finalStatus = "Late";
    }
    const payload = {
      status: finalStatus,
      checkIn: (finalStatus === "Present" || finalStatus === "Late") ? nowStr : "—",
      timestamp: new Date(),
      dateId,
    };
    try {
      await setDoc(doc(db, "attendance", dateId, "records", empId), payload, { merge: true });
      setRecords(prev => prev.map(r => r.id === empId ? { ...r, ...payload } : r));
    } catch (e) { console.error("Attendance save error:", e); }
  };

  /* ══════════════════════════════════════════════════════════
     FIXED fetchMonthlyReport
     
     OLD approach (broken): getDocs(collection(db,"attendance"))
     — parent docs nahi milte kyunki Firestore subcollection se
     parent auto-create nahi hota.
     
     NEW approach (fixed): month ke har din ka date string
     generate karo, phir seedha us din ki "records" subcollection
     fetch karo. Empty days silently skip ho jaate hain.
  ══════════════════════════════════════════════════════════ */
  const fetchMonthlyReport = useCallback(async (targetMonth) => {
    const month   = targetMonth || reportMonth;
    const stats   = {};
    const details = {};

    try {
      // ✅ FIX: month ke saare dates generate karo
      const allDates = getDatesInMonth(month);

      // ✅ FIX: har date ki records subcollection seedha fetch karo
      // (parent doc exist na kare toh bhi kaam karta hai)
      const results = await Promise.all(
        allDates.map(dateStr =>
          getDocs(collection(db, "attendance", dateStr, "records"))
            .then(snap => ({ dateStr, snap }))
            .catch(() => ({ dateStr, snap: { forEach: () => {} } })) // empty day = skip
        )
      );

      // Aggregate all results
      results.forEach(({ dateStr, snap }) => {
        snap.forEach(d => {
          const data  = d.data();
          const empId = d.id;

          if (!data.status || data.status === 'Pending') return; // skip pending

          if (!stats[empId])   stats[empId]   = { present: 0, late: 0, absent: 0, leave: 0 };
          if (!details[empId]) details[empId] = {};

          // ✅ Avoid double counting
          if (details[empId][dateStr]) return;

          details[empId][dateStr] = {
            status:  data.status  || '—',
            checkIn: data.checkIn || '—',
          };

          if      (data.status === 'Present') stats[empId].present++;
          else if (data.status === 'Late')    stats[empId].late++;
          else if (data.status === 'Absent')  stats[empId].absent++;
          else if (data.status === 'Leave')   stats[empId].leave++;
        });
      });

      // ✅ Merge today's in-memory state (for current month only)
      // This handles the case where Firestore write is still pending
      if (dateId.startsWith(month)) {
        recordsRef.current.forEach(r => {
          if (!r.status || r.status === 'Pending') return;

          if (!stats[r.id])   stats[r.id]   = { present: 0, late: 0, absent: 0, leave: 0 };
          if (!details[r.id]) details[r.id] = {};

          // Only add if not already counted from Firestore
          if (!details[r.id][dateId]) {
            details[r.id][dateId] = {
              status:  r.status,
              checkIn: r.checkIn || '—',
            };
            if      (r.status === 'Present') stats[r.id].present++;
            else if (r.status === 'Late')    stats[r.id].late++;
            else if (r.status === 'Absent')  stats[r.id].absent++;
            else if (r.status === 'Leave')   stats[r.id].leave++;
          }
        });
      }

      setMonthlyStats(stats);
      setDailyDetails(details);
      return { stats, details };

    } catch (e) {
      console.error("fetchMonthlyReport error:", e);
      return { stats: {}, details: {} };
    }
  }, [reportMonth]);

  const openPersonView = async (emp) => {
    setSelectedEmp(emp);
    await fetchMonthlyReport(reportMonth);
    setView('person');
  };

  const goToMonthly = async () => {
    await fetchMonthlyReport(reportMonth);
    setView('monthly');
  };

  /* Month navigation */
  const changeMonth = async (direction) => {
    const d = new Date(reportMonth + "-01");
    d.setMonth(d.getMonth() + direction);
    const newMonth = d.toISOString().slice(0, 7);
    setReportMonth(newMonth);
    await fetchMonthlyReport(newMonth);
  };

  const monthDisplayLabel = new Date(reportMonth + "-01")
    .toLocaleString('default', { month: 'long', year: 'numeric' });
  const isCurrentMonth = reportMonth >= new Date().toISOString().slice(0, 7);

  /* Monthly PDF */
  const downloadMonthlyPDF = async () => {
    setDownloading(true);
    try {
      const JsPDF = await loadJsPDF();
      const { stats } = await fetchMonthlyReport(reportMonth);
      const monthLabel  = monthDisplayLabel;
      const generatedOn = new Date().toLocaleString();
      const pdf = new JsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      const pw  = pdf.internal.pageSize.getWidth();

      pdf.setFillColor(98, 48, 104);
      pdf.rect(0, 0, pw, 70, 'F');
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(22); pdf.setTextColor(240, 234, 248);
      pdf.text('Monthly Attendance Report', pw / 2, 30, { align: 'center' });
      pdf.setFontSize(13);
      pdf.text(monthLabel, pw / 2, 52, { align: 'center' });
      pdf.setFontSize(9); pdf.setTextColor(150, 120, 100);
      pdf.text(`Generated: ${generatedOn}`, 40, 88);

      const totals = recordsRef.current.reduce((acc, r) => {
        const s = stats[r.id] || { present: 0, late: 0, absent: 0, leave: 0 };
        acc.present += s.present; acc.late += s.late;
        acc.absent  += s.absent;  acc.leave += s.leave;
        return acc;
      }, { present: 0, late: 0, absent: 0, leave: 0 });

      pdf.autoTable({
        startY: 105,
        head: [['#', 'Employee Name', 'Role', 'Present', 'Late', 'Absent', 'Leave', 'Total Days']],
        body: recordsRef.current.map((r, i) => {
          const s = stats[r.id] || { present: 0, late: 0, absent: 0, leave: 0 };
          return [i + 1, r.name || '—', r.role || '—', s.present, s.late, s.absent, s.leave,
            s.present + s.late + s.absent + s.leave];
        }),
        foot: [['', 'TOTAL', '', totals.present, totals.late, totals.absent, totals.leave,
          totals.present + totals.late + totals.absent + totals.leave]],
        theme: 'grid',
        headStyles: { fillColor: [98, 48, 104], textColor: [240, 234, 248], fontStyle: 'bold', fontSize: 11, halign: 'center' },
        bodyStyles: { fontSize: 11, halign: 'center' },
        footStyles: { fillColor: [51, 27, 63], textColor: [240, 234, 248], fontStyle: 'bold', fontSize: 11, halign: 'center' },
        columnStyles: { 0: { cellWidth: 30 }, 1: { halign: 'left', cellWidth: 140 }, 2: { halign: 'left', cellWidth: 110 } },
        alternateRowStyles: { fillColor: [250, 246, 240] },
        showFoot: 'lastPage',
        didParseCell(data) {
          if (data.section === 'body') {
            if (data.column.index === 3) { data.cell.styles.textColor = [21, 128, 61];  data.cell.styles.fontStyle = 'bold'; }
            if (data.column.index === 4) { data.cell.styles.textColor = [180, 83, 9];   data.cell.styles.fontStyle = 'bold'; }
            if (data.column.index === 5) { data.cell.styles.textColor = [138, 28, 55];  data.cell.styles.fontStyle = 'bold'; }
            if (data.column.index === 6) { data.cell.styles.textColor = [98, 48, 104];  data.cell.styles.fontStyle = 'bold'; }
          }
        },
        margin: { left: 40, right: 40 },
      });

      addPdfFooter(pdf, pw);
      pdf.save(`WellMind_Attendance_${reportMonth}.pdf`);
    } catch (e) { console.error(e); alert("PDF generation failed."); }
    finally { setDownloading(false); }
  };

  /* Per-Person PDF */
  const downloadPersonPDF = async () => {
    if (!selectedEmp) return;
    setPersonDl(true);
    try {
      const JsPDF = await loadJsPDF();
      const { details, stats: freshStats } = await fetchMonthlyReport(reportMonth);
      const empDays   = details[selectedEmp.id] || {};
      const empStats  = freshStats[selectedEmp.id] || { present: 0, late: 0, absent: 0, leave: 0 };
      const totalDays = empStats.present + empStats.late + empStats.absent + empStats.leave;
      const rate      = totalDays > 0 ? Math.round(((empStats.present + empStats.late) / totalDays) * 100) : 0;
      const monthLabel  = monthDisplayLabel;
      const generatedOn = new Date().toLocaleString();

      const pdf = new JsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pw  = pdf.internal.pageSize.getWidth();

      pdf.setFillColor(98, 48, 104); pdf.rect(0, 0, pw, 80, 'F');
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(18); pdf.setTextColor(255, 255, 255);
      pdf.text(selectedEmp.name || '—', 40, 35);
      pdf.setFontSize(11);
      pdf.text(`${selectedEmp.role || '—'}  ·  ${monthLabel}`, 40, 55);
      pdf.setFontSize(9); pdf.setTextColor(200, 180, 160);
      pdf.text(`Generated: ${generatedOn}`, 40, 70);

      const barY = 100;
      pdf.setFillColor(241, 235, 225); pdf.roundedRect(40, barY, pw - 80, 36, 6, 6, 'F');
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(11); pdf.setTextColor(45, 27, 56);
      pdf.text('Attendance Rate', 56, barY + 14);
      pdf.setFontSize(13); pdf.setTextColor(98, 48, 104);
      pdf.text(`${rate}%`, pw - 56, barY + 14, { align: 'right' });
      pdf.setFillColor(220, 210, 200); pdf.roundedRect(56, barY + 20, pw - 112, 8, 4, 4, 'F');
      pdf.setFillColor(98, 48, 104);
      pdf.roundedRect(56, barY + 20, Math.max(8, (rate / 100) * (pw - 112)), 8, 4, 4, 'F');

      const cY = 152, cW = (pw - 80 - 30) / 4, cH = 58, gap = 10;
      [
        { label: 'Present', value: empStats.present, bg: [220,252,231], fg: [21,128,61]  },
        { label: 'Late',    value: empStats.late,    bg: [254,243,199], fg: [180,83,9]   },
        { label: 'Absent',  value: empStats.absent,  bg: [254,226,226], fg: [138,28,55]  },
        { label: 'Leave',   value: empStats.leave,   bg: [224,231,255], fg: [98,48,104]  },
      ].forEach((card, i) => {
        const x = 40 + i * (cW + gap);
        pdf.setFillColor(...card.bg); pdf.roundedRect(x, cY, cW, cH, 8, 8, 'F');
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(22); pdf.setTextColor(...card.fg);
        pdf.text(String(card.value), x + cW / 2, cY + 28, { align: 'center' });
        pdf.setFontSize(9); pdf.setFont('helvetica', 'normal'); pdf.setTextColor(100, 116, 139);
        pdf.text(card.label, x + cW / 2, cY + 44, { align: 'center' });
      });

      const daysList = Object.entries(empDays)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([dateStr, data], idx) => {
          const d = new Date(dateStr);
          return [idx + 1,
            d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
            d.toLocaleDateString('en-US', { weekday: 'long' }),
            data.checkIn || '—',
            data.status  || '—',
          ];
        });

      pdf.autoTable({
        startY: cY + cH + 20,
        head: [['#', 'Date', 'Day', 'Check In', 'Status']],
        body: daysList, theme: 'grid',
        headStyles: { fillColor: [98, 48, 104], textColor: [240, 234, 248], fontStyle: 'bold', fontSize: 11, halign: 'center' },
        bodyStyles: { fontSize: 11, halign: 'center' },
        columnStyles: { 0: { cellWidth: 30 }, 1: { halign: 'left', cellWidth: 110 },
          2: { halign: 'left', cellWidth: 110 }, 3: { cellWidth: 80 }, 4: { cellWidth: 80 } },
        alternateRowStyles: { fillColor: [250, 246, 240] },
        didParseCell(data) {
          if (data.section === 'body' && data.column.index === 4) {
            const s = data.cell.raw;
            if (s === 'Present') { data.cell.styles.textColor = [21,128,61];  data.cell.styles.fontStyle = 'bold'; }
            if (s === 'Late')    { data.cell.styles.textColor = [180,83,9];   data.cell.styles.fontStyle = 'bold'; }
            if (s === 'Absent')  { data.cell.styles.textColor = [138,28,55];  data.cell.styles.fontStyle = 'bold'; }
            if (s === 'Leave')   { data.cell.styles.textColor = [98,48,104];  data.cell.styles.fontStyle = 'bold'; }
          }
        },
        foot: [['', 'SUMMARY', '', '',
          `P:${empStats.present}  L:${empStats.late}  A:${empStats.absent}  Lv:${empStats.leave}`]],
        footStyles: { fillColor: [51, 27, 63], textColor: [240, 234, 248], fontStyle: 'bold', fontSize: 10, halign: 'center' },
        showFoot: 'lastPage', margin: { left: 40, right: 40 },
      });

      addPdfFooter(pdf, pw);
      pdf.save(`${(selectedEmp.name || 'Employee').replace(/\s+/g, '_')}_Attendance_${reportMonth}.pdf`);
    } catch (e) { console.error(e); alert("PDF generation failed."); }
    finally { setPersonDl(false); }
  };

  /* ── Person Detail View ──────────────────────────────────── */
  const PersonDetail = () => {
    if (!selectedEmp) return null;
    const empDays   = dailyDetails[selectedEmp.id] || {};
    const empStats  = monthlyStats[selectedEmp.id] || { present: 0, late: 0, absent: 0, leave: 0 };
    const totalDays = empStats.present + empStats.late + empStats.absent + empStats.leave;
    const rate      = totalDays > 0 ? Math.round(((empStats.present + empStats.late) / totalDays) * 100) : 0;

    const daysList = Object.entries(empDays)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([dateStr, data]) => {
        const d = new Date(dateStr);
        return {
          dateStr,
          dayName:   d.toLocaleDateString('en-US', { weekday: 'short' }),
          dateLabel: d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }),
          ...data,
        };
      });

    const statCards = [
      { label: 'Present', value: empStats.present, bg: '#dcfce7', color: '#15803d',          icon: '✅' },
      { label: 'Late',    value: empStats.late,    bg: '#fef3c7', color: '#b45309',           icon: '⏰' },
      { label: 'Absent',  value: empStats.absent,  bg: '#fee2e2', color: BRAND.secondaryRed,  icon: '❌' },
      { label: 'Leave',   value: empStats.leave,   bg: '#e0e7ff', color: BRAND.primaryPurple, icon: '📋' },
    ];

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <button onClick={() => setView('monthly')}
              style={{ background: BRAND.textLight, border: `1.5px solid ${BRAND.accentGold}`, borderRadius: 8, padding: '8px 16px', cursor: 'pointer', fontWeight: 700, color: BRAND.primaryPurple, fontSize: 13 }}>
              ← Back
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: `linear-gradient(135deg,${BRAND.primaryPurple},${BRAND.primaryDark})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: BRAND.textLight, fontWeight: 900, fontSize: 18 }}>
                {(selectedEmp.name || '?')[0].toUpperCase()}
              </div>
              <div>
                <h2 style={{ margin: 0, color: BRAND.textMain, fontSize: 18, fontWeight: 800 }}>{selectedEmp.name}</h2>
                <div style={{ color: BRAND.primaryPurple, fontWeight: 600, fontSize: 13 }}>{monthDisplayLabel} · {selectedEmp.role}</div>
              </div>
            </div>
          </div>
          <button onClick={downloadPersonPDF} disabled={personDl}
            style={{ background: personDl ? '#94a3b8' : BRAND.actionTeal, color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: personDl ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 13 }}>
            {personDl ? '⏳ Generating...' : '📄 Download Report'}
          </button>
        </div>

        {/* Attendance Rate */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '18px 24px', marginBottom: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: `4px solid ${BRAND.primaryPurple}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontWeight: 700, color: BRAND.textMain, fontSize: 14 }}>
              Attendance Rate — {monthDisplayLabel}
            </span>
            <span style={{ fontWeight: 800, fontSize: 18, color: BRAND.primaryPurple }}>{rate}%</span>
          </div>
          <div style={{ background: '#e8dde8', borderRadius: 99, height: 10, overflow: 'hidden' }}>
            <div style={{ width: `${rate}%`, height: '100%', borderRadius: 99,
              background: `linear-gradient(90deg,${BRAND.primaryPurple},${BRAND.accentGold})`,
              transition: 'width 0.6s ease' }} />
          </div>
          <div style={{ marginTop: 8, color: '#64748b', fontSize: 12 }}>
            <b style={{ color: BRAND.textMain }}>{totalDays}</b> days recorded this month
          </div>
        </div>

        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 22 }}>
          {statCards.map(c => (
            <div key={c.label} style={{ background: c.bg, borderRadius: 12, padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>{c.icon}</div>
              <div style={{ fontSize: 30, fontWeight: 900, color: c.color }}>{c.value}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: c.color, opacity: 0.85 }}>{c.label}</div>
            </div>
          ))}
        </div>

        {/* Day-by-Day Table */}
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 22px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: BRAND.mainBG }}>
            <h3 style={{ margin: 0, color: BRAND.textMain, fontSize: 15, fontWeight: 800 }}>Day-by-Day Breakdown</h3>
            <span style={{ fontSize: 12, color: BRAND.primaryPurple, fontWeight: 600 }}>{daysList.length} entries</span>
          </div>
          {daysList.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 14 }}>
              No attendance records found for this period.
            </div>
          ) : (
            <div style={{ maxHeight: 460, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f8fafc', position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr>
                    <th style={thStyle}>#</th>
                    <th style={{ ...thStyle, textAlign: 'left', paddingLeft: 20 }}>DATE</th>
                    <th style={thStyle}>DAY</th>
                    <th style={thStyle}>CHECK IN</th>
                    <th style={thStyle}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {daysList.map((day, idx) => (
                    <tr key={day.dateStr} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#fff' : '#fafaf8' }}>
                      <td style={{ ...tdCenter, color: '#94a3b8', fontSize: 13 }}>{idx + 1}</td>
                      <td style={{ ...tdStyle, fontWeight: 600, fontSize: 14 }}>{day.dateLabel}</td>
                      <td style={{ ...tdCenter, color: '#64748b', fontSize: 13, fontWeight: 600 }}>{day.dayName}</td>
                      <td style={{ ...tdCenter, fontFamily: 'monospace', fontSize: 13 }}>{day.checkIn}</td>
                      <td style={tdCenter}><Badge status={day.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (loading) return (
    <div style={{ padding: 50, textAlign: 'center', color: BRAND.primaryPurple, fontWeight: 700, fontSize: 16 }}>
      Syncing WellMind Data...
    </div>
  );

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: BRAND.mainBG, fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      <div style={{ width: "260px", flexShrink: 0 }}>
        <Sidebar onNavigate={onNavigate} />
      </div>
      <div style={{ flex: 1, padding: "30px 40px", overflowX: "auto" }}>

        {/* HEADER */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, color: BRAND.textMain, fontSize: 22, fontWeight: 800 }}>
              {view === 'daily'   ? 'Daily Attendance'
               : view === 'monthly' ? `Monthly Report — ${monthDisplayLabel}`
               : `${selectedEmp?.name}'s Detail`}
            </h2>
            <div style={{ color: BRAND.primaryPurple, fontWeight: 600, fontSize: 13, marginTop: 3 }}>
              {new Date().toDateString()}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {view !== 'person' && (
              <>
                {/* Month Navigator — only in monthly view */}
                {view === 'monthly' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', borderRadius: 8, padding: '6px 12px', border: `1.5px solid rgba(98,48,104,0.25)` }}>
                    <button onClick={() => changeMonth(-1)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 800, fontSize: 18, color: BRAND.primaryPurple, lineHeight: 1, padding: '0 4px' }}>‹</button>
                    <span style={{ fontSize: 13, fontWeight: 700, color: BRAND.textMain, minWidth: 120, textAlign: 'center' }}>{monthDisplayLabel}</span>
                    <button onClick={() => changeMonth(1)} disabled={isCurrentMonth}
                      style={{ background: 'none', border: 'none', cursor: isCurrentMonth ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: 18, color: isCurrentMonth ? '#ccc' : BRAND.primaryPurple, lineHeight: 1, padding: '0 4px' }}>›</button>
                  </div>
                )}

                <button
                  onClick={async () => { if (view === 'daily') await goToMonthly(); else setView('daily'); }}
                  style={{ background: BRAND.primaryPurple, color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>
                  {view === 'daily' ? '📊 View Report' : "📅 Today's Sheet"}
                </button>
                <button onClick={downloadMonthlyPDF} disabled={downloading}
                  style={{ background: downloading ? '#94a3b8' : BRAND.secondaryRed, color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: downloading ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 13 }}>
                  {downloading ? '⏳ Generating...' : '📄 Download PDF'}
                </button>
              </>
            )}
            <div style={{ background: '#fff', padding: '10px 18px', borderRadius: 8, border: `2px solid ${BRAND.primaryPurple}`, color: BRAND.primaryPurple, fontWeight: 800, fontSize: 14 }}>
              {currentTime}
            </div>
          </div>
        </header>

        {/* PERSON DETAIL */}
        {view === 'person' && <PersonDetail />}

        {/* DAILY / MONTHLY TABLE */}
        {view !== 'person' && (
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 4px 15px rgba(0,0,0,0.05)', overflow: 'hidden', border: `1px solid rgba(98,48,104,0.12)` }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ background: BRAND.mainBG }}>
                {view === 'daily' ? (
                  <tr>
                    <th style={thStyle}>EMPLOYEE</th>
                    <th style={thStyle}>SCHEDULED</th>
                    <th style={thStyle}>CHECK IN</th>
                    <th style={thStyle}>PRESENT</th>
                    <th style={thStyle}>ABSENT</th>
                    <th style={thStyle}>LEAVE</th>
                    <th style={thStyle}>STATUS</th>
                  </tr>
                ) : (
                  <tr>
                    <th style={{ ...thStyle, textAlign: 'left', paddingLeft: 20 }}>EMPLOYEE</th>
                    <th style={{ ...thStyle, color: '#16a34a' }}>PRESENT</th>
                    <th style={{ ...thStyle, color: '#b45309' }}>LATE</th>
                    <th style={{ ...thStyle, color: BRAND.secondaryRed }}>ABSENT</th>
                    <th style={{ ...thStyle, color: BRAND.primaryPurple }}>LEAVE</th>
                    <th style={thStyle}>TOTAL DAYS</th>
                    <th style={thStyle}>DETAILS</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {view === 'daily' ? (
                  records.map(r => (
                    <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={tdStyle}>
                        <span style={{ fontWeight: 700, fontSize: 14 }}>{r.name}</span>
                        <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{r.role}</div>
                      </td>
                      <td style={tdCenter}>{r.scheduledIn}</td>
                      <td style={tdCenter}>{r.checkIn || "—"}</td>
                      <td style={tdCenter}>
                        <input type="checkbox" checked={r.status === "Present" || r.status === "Late"}
                          onChange={() => handleAttendance(r.id, r.scheduledIn, "Present")}
                          style={{ accentColor: '#22c55e', width: 18, height: 18, cursor: 'pointer' }} />
                      </td>
                      <td style={tdCenter}>
                        <input type="checkbox" checked={r.status === "Absent"}
                          onChange={() => handleAttendance(r.id, r.scheduledIn, "Absent")}
                          style={{ accentColor: BRAND.secondaryRed, width: 18, height: 18, cursor: 'pointer' }} />
                      </td>
                      <td style={tdCenter}>
                        <input type="checkbox" checked={r.status === "Leave"}
                          onChange={() => handleAttendance(r.id, r.scheduledIn, "Leave")}
                          style={{ accentColor: BRAND.primaryPurple, width: 18, height: 18, cursor: 'pointer' }} />
                      </td>
                      <td style={tdCenter}><Badge status={r.status} /></td>
                    </tr>
                  ))
                ) : (
                  records.map(r => {
                    const s     = monthlyStats[r.id] || { present: 0, late: 0, absent: 0, leave: 0 };
                    const total = s.present + s.late + s.absent + s.leave;
                    return (
                      <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                        <td style={{ ...tdStyle, display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 38, height: 38, borderRadius: '50%', background: `linear-gradient(135deg,${BRAND.primaryPurple},${BRAND.primaryDark})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 15, flexShrink: 0 }}>
                            {(r.name || '?')[0].toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14 }}>{r.name}</div>
                            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 1 }}>{r.role}</div>
                          </div>
                        </td>
                        <td style={tdCenter}><span style={{ fontWeight: 800, fontSize: 15, color: '#15803d' }}>{s.present}</span></td>
                        <td style={tdCenter}><span style={{ fontWeight: 800, fontSize: 15, color: '#b45309' }}>{s.late}</span></td>
                        <td style={tdCenter}><span style={{ fontWeight: 800, fontSize: 15, color: BRAND.secondaryRed }}>{s.absent}</span></td>
                        <td style={tdCenter}><span style={{ fontWeight: 800, fontSize: 15, color: BRAND.primaryPurple }}>{s.leave}</span></td>
                        <td style={tdCenter}>
                          <b style={{ fontSize: 15, color: total > 0 ? BRAND.textMain : '#94a3b8' }}>{total}</b>
                        </td>
                        <td style={tdCenter}>
                          <button onClick={() => openPersonView(r)}
                            style={{ background: 'transparent', color: BRAND.actionTeal, border: `1.5px solid ${BRAND.actionTeal}`, borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                            👁 View
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Attendance;