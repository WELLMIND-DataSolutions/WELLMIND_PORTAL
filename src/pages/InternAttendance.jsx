import React, { useState, useEffect, useRef } from 'react';
import Sidebar from '../Sidebar';
import { db } from "../firebase";
import {
  collection,
  collectionGroup,
  getDocs,
  doc,
  setDoc,
  onSnapshot,
  query,
  where
} from "firebase/firestore";

/* ─── WellMind Brand Palette ────────────────────────────── */
const COLORS = {
  primaryPurple: "#623068",
  primaryDark:   "#331B3F",
  primaryMid:    "#47234F",
  secondaryRed:  "#8A1C37",
  actionTeal:    "#0D7289",
  accentGold:    "#C0854A",
  mainBgCream:   "#F5F0E5",
  darkBgPurple:  "#1A1228",
  textMain:      "#2D1B38",
  textLight:     "#F0EAF8",
};

const dateId = new Date().toISOString().split("T")[0];

const formatCurrentTime = () =>
  new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

const loadJsPDF = () =>
  new Promise((resolve, reject) => {
    if (window.jspdf) { resolve(window.jspdf.jsPDF); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    s.onload = () => {
      const at = document.createElement("script");
      at.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js";
      at.onload = () => resolve(window.jspdf.jsPDF);
      at.onerror = reject;
      document.head.appendChild(at);
    };
    s.onerror = reject;
    document.head.appendChild(s);
  });

const STATUS_COLORS = {
  Present: { bg: "#dcfce7", color: "#15803d" },
  Late:    { bg: "#fef3c7", color: "#b45309" },
  Absent:  { bg: "#fee2e2", color: "#b91c1c" },
  Leave:   { bg: "#e0e7ff", color: COLORS.primaryPurple },
  Pending: { bg: "#f1f5f9", color: "#64748b" },
};

const Badge = ({ status }) => {
  const c = STATUS_COLORS[status] || STATUS_COLORS.Pending;
  return (
    <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: c.bg, color: c.color, display: "inline-block", letterSpacing: 0.3 }}>
      {status}
    </span>
  );
};

const addPdfFooter = (pdf, pageWidth) => {
  const n = pdf.internal.getNumberOfPages();
  for (let p = 1; p <= n; p++) {
    pdf.setPage(p);
    const ph = pdf.internal.pageSize.getHeight();
    pdf.setDrawColor(226, 232, 240);
    pdf.line(40, ph - 25, pageWidth - 40, ph - 25);
    pdf.setFontSize(8); pdf.setTextColor(148, 163, 184);
    pdf.text("WellMind Data Solutions – Internal Use", 40, ph - 12);
    pdf.text(`Page ${p} of ${n}`, pageWidth - 40, ph - 12, { align: "right" });
  }
};

const thStyle  = { padding: "14px 12px", fontSize: 12, color: COLORS.primaryMid, fontWeight: 700, textAlign: "center", letterSpacing: 0.5 };
const tdStyle  = { padding: "14px 20px", fontSize: 14, color: COLORS.textMain };
const tdCenter = { padding: "14px 12px", textAlign: "center", fontSize: 14, color: COLORS.textMain };

const InternAttendance = ({ onNavigate }) => {
  const [records, setRecords]           = useState([]);
  const [monthlyStats, setMonthlyStats] = useState({});
  const [dailyDetails, setDailyDetails] = useState({});
  const [view, setView]                 = useState("daily");
  const [selectedEmp, setSelectedEmp]   = useState(null);
  const [loading, setLoading]           = useState(true);
  const [currentTime, setCurrentTime]   = useState(formatCurrentTime());
  const [downloading, setDownloading]   = useState(false);
  const [personDl, setPersonDl]         = useState(false);

  const recordsRef = useRef([]);
  useEffect(() => { recordsRef.current = records; }, [records]);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(formatCurrentTime()), 1000);
    return () => clearInterval(t);
  }, []);

  /* ── Load interns + today's real-time listener ─────── */
  useEffect(() => {
    let unsub = () => {};
    const init = async () => {
      try {
        const snap = await getDocs(collection(db, "interns"));
        const initial = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
          scheduledIn: d.data().checkInTime || "09:00 AM",
          status: "Pending",
          checkIn: null,
        }));
        setRecords(initial);
        recordsRef.current = initial;

        unsub = onSnapshot(
          collection(db, "intern_attendance", dateId, "records"),
          (s) => {
            const updates = {};
            s.forEach((d) => { updates[d.id] = d.data(); });
            setRecords((prev) =>
              prev.map((r) => (updates[r.id] ? { ...r, ...updates[r.id] } : r))
            );
          }
        );
      } catch (e) {
        console.error("Init error:", e);
      } finally {
        setLoading(false);
      }
    };
    init();
    return () => unsub();
  }, []);

  /* ── Mark attendance ────────────────────────────────── */
  const handleAttendance = async (empId, empScheduledIn, type) => {
    const nowStr = formatCurrentTime();
    let finalStatus = type;

    if (type === "Present") {
      const parseMin = (t) => {
        if (!t || !t.includes(" ")) return 0;
        const [time, mod] = t.split(" ");
        let [h, m] = time.split(":");
        if (h === "12") h = "0";
        return (parseInt(h) + (mod === "PM" ? 12 : 0)) * 60 + parseInt(m);
      };
      if (parseMin(nowStr) > parseMin(empScheduledIn) + 5) finalStatus = "Late";
    }

    const payload = {
      status:   finalStatus,
      checkIn:  finalStatus === "Present" || finalStatus === "Late" ? nowStr : "—",
      timestamp: new Date(),
      dateId,       // ← stored for collectionGroup queries
      internId: empId,
    };

    try {
      await setDoc(
        doc(db, "intern_attendance", dateId, "records", empId),
        payload,
        { merge: true }
      );
      setRecords((prev) =>
        prev.map((r) => (r.id === empId ? { ...r, ...payload } : r))
      );
    } catch (e) { console.error("Save error:", e); }
  };

  /* ══════════════════════════════════════════════════════
     CORE FIX: fetchMonthlyReport

     Pehla tarika (getDocs of parent collection) fail
     hota tha kyunki Firestore mein parent document
     exist nahi hota jab sirf subcollection ho.

     New approach: din 1 se aaj tak har din ki
     subcollection manually parallel fetch karo.
     Yeh 100% reliable hai aur koi index bhi nahi chahiye.
  ══════════════════════════════════════════════════════ */
  const fetchMonthlyReport = async () => {
    const stats   = {};
    const details = {};

    const now      = new Date();
    const year     = now.getFullYear();
    const month    = now.getMonth(); // 0-indexed
    const todayDay = now.getDate();

    // Build list of all days from 1 to today
    const dayStrings = [];
    for (let d = 1; d <= todayDay; d++) {
      dayStrings.push(
        `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`
      );
    }

    try {
      // Fetch all days in parallel — fast even with 30 days
      const results = await Promise.all(
        dayStrings.map((dayStr) =>
          getDocs(collection(db, "intern_attendance", dayStr, "records"))
            .then((snap) => ({ dayStr, snap }))
            .catch(() => ({ dayStr, snap: { forEach: () => {} } })) // silent fail per day
        )
      );

      results.forEach(({ dayStr, snap }) => {
        snap.forEach((docSnap) => {
          const data  = docSnap.data();
          const empId = docSnap.id;

          if (!stats[empId])   stats[empId]   = { present: 0, late: 0, absent: 0, leave: 0 };
          if (!details[empId]) details[empId] = {};

          details[empId][dayStr] = {
            status:  data.status  || "—",
            checkIn: data.checkIn || "—",
          };

          if      (data.status === "Present") stats[empId].present++;
          else if (data.status === "Late")    stats[empId].late++;
          else if (data.status === "Absent")  stats[empId].absent++;
          else if (data.status === "Leave")   stats[empId].leave++;
        });
      });

      // Also merge today's in-memory state
      // (handles case where Firestore write is still pending)
      recordsRef.current.forEach((r) => {
        if (r.status && r.status !== "Pending") {
          if (!stats[r.id])   stats[r.id]   = { present: 0, late: 0, absent: 0, leave: 0 };
          if (!details[r.id]) details[r.id] = {};

          // Only add today if not already fetched from Firestore
          if (!details[r.id][dateId]) {
            details[r.id][dateId] = { status: r.status, checkIn: r.checkIn || "—" };
            if      (r.status === "Present") stats[r.id].present++;
            else if (r.status === "Late")    stats[r.id].late++;
            else if (r.status === "Absent")  stats[r.id].absent++;
            else if (r.status === "Leave")   stats[r.id].leave++;
          }
        }
      });

      setMonthlyStats(stats);
      setDailyDetails(details);
      return { stats, details };

    } catch (e) {
      console.error("fetchMonthlyReport error:", e);
      return { stats: {}, details: {} };
    }
  };

  const openPersonView = async (emp) => {
    setSelectedEmp(emp);
    await fetchMonthlyReport();
    setView("person");
  };

  const goToMonthly = async () => {
    await fetchMonthlyReport();
    setView("monthly");
  };

  /* ── Monthly PDF ────────────────────────────────────── */
  const downloadMonthlyPDF = async () => {
    setDownloading(true);
    try {
      const JsPDF = await loadJsPDF();
      const { stats } = await fetchMonthlyReport();
      const monthLabel  = new Date().toLocaleString("default", { month: "long", year: "numeric" });
      const generatedOn = new Date().toLocaleString();

      const pdf = new JsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
      const pw  = pdf.internal.pageSize.getWidth();

      pdf.setFillColor(98, 48, 104);
      pdf.rect(0, 0, pw, 70, "F");
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(22); pdf.setTextColor(245, 240, 229);
      pdf.text("Monthly Intern Attendance Report", pw / 2, 30, { align: "center" });
      pdf.setFontSize(13); pdf.text(monthLabel, pw / 2, 52, { align: "center" });
      pdf.setFontSize(9); pdf.setTextColor(180, 160, 140);
      pdf.text(`Generated: ${generatedOn}`, 40, 88);

      const totals = recordsRef.current.reduce(
        (acc, r) => {
          const s = stats[r.id] || { present: 0, late: 0, absent: 0, leave: 0 };
          acc.present += s.present; acc.late += s.late;
          acc.absent  += s.absent;  acc.leave += s.leave;
          return acc;
        },
        { present: 0, late: 0, absent: 0, leave: 0 }
      );

      pdf.autoTable({
        startY: 105,
        head: [["#", "Intern Name", "Role", "Present", "Late", "Absent", "Leave", "Total Days"]],
        body: recordsRef.current.map((r, i) => {
          const s = stats[r.id] || { present: 0, late: 0, absent: 0, leave: 0 };
          return [i + 1, r.name || "—", r.role || "—", s.present, s.late, s.absent, s.leave, s.present + s.late + s.absent + s.leave];
        }),
        foot: [["", "TOTAL", "", totals.present, totals.late, totals.absent, totals.leave, totals.present + totals.late + totals.absent + totals.leave]],
        theme: "grid",
        headStyles: { fillColor: [98, 48, 104], textColor: [245, 240, 229], fontStyle: "bold", halign: "center" },
        bodyStyles: { halign: "center" },
        footStyles: { fillColor: [51, 27, 63], textColor: [245, 240, 229], fontStyle: "bold", halign: "center" },
        alternateRowStyles: { fillColor: [250, 246, 240] },
        showFoot: "lastPage",
        didParseCell(d) {
          if (d.section === "body") {
            if (d.column.index === 3) { d.cell.styles.textColor = [21,128,61];  d.cell.styles.fontStyle = "bold"; }
            if (d.column.index === 4) { d.cell.styles.textColor = [180,83,9];   d.cell.styles.fontStyle = "bold"; }
            if (d.column.index === 5) { d.cell.styles.textColor = [138,28,55];  d.cell.styles.fontStyle = "bold"; }
            if (d.column.index === 6) { d.cell.styles.textColor = [98,48,104];  d.cell.styles.fontStyle = "bold"; }
          }
        },
        margin: { left: 40, right: 40 },
      });

      addPdfFooter(pdf, pw);
      pdf.save(`WellMind_Intern_Attendance_${new Date().toISOString().slice(0, 7)}.pdf`);
    } catch (e) { console.error(e); alert("PDF generation failed."); }
    finally { setDownloading(false); }
  };

  /* ── Per-Intern PDF ─────────────────────────────────── */
  const downloadPersonPDF = async () => {
    if (!selectedEmp) return;
    setPersonDl(true);
    try {
      const JsPDF = await loadJsPDF();
      const { details, stats: fs } = await fetchMonthlyReport();
      const empDays  = details[selectedEmp.id] || {};
      const empStats = fs[selectedEmp.id] || { present: 0, late: 0, absent: 0, leave: 0 };
      const total    = empStats.present + empStats.late + empStats.absent + empStats.leave;
      const rate     = total > 0 ? Math.round(((empStats.present + empStats.late) / total) * 100) : 0;
      const ml       = new Date().toLocaleString("default", { month: "long", year: "numeric" });
      const gen      = new Date().toLocaleString();

      const pdf = new JsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pw  = pdf.internal.pageSize.getWidth();

      pdf.setFillColor(13, 114, 137); pdf.rect(0, 0, pw, 80, "F");
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(18); pdf.setTextColor(255,255,255);
      pdf.text(selectedEmp.name || "—", 40, 35);
      pdf.setFontSize(11); pdf.text(`${selectedEmp.role || "—"}  ·  ${ml}`, 40, 55);
      pdf.setFontSize(9); pdf.setTextColor(180,230,240); pdf.text(`Generated: ${gen}`, 40, 70);

      // Rate bar
      const by = 100;
      pdf.setFillColor(240,235,225); pdf.roundedRect(40, by, pw-80, 36, 6,6,"F");
      pdf.setFont("helvetica","bold"); pdf.setFontSize(11); pdf.setTextColor(45,27,56);
      pdf.text("Attendance Rate", 56, by+14);
      pdf.setFontSize(13); pdf.setTextColor(13,114,137);
      pdf.text(`${rate}%`, pw-56, by+14, { align:"right" });
      pdf.setFillColor(220,210,200); pdf.roundedRect(56, by+20, pw-112, 8, 4,4,"F");
      pdf.setFillColor(13,114,137); pdf.roundedRect(56, by+20, Math.max(8,(rate/100)*(pw-112)), 8, 4,4,"F");

      // Cards
      const cy=152, cw=(pw-80-30)/4, ch=58, g=10;
      [{label:"Present",value:empStats.present,bg:[220,252,231],fg:[21,128,61]},
       {label:"Late",value:empStats.late,bg:[254,243,199],fg:[180,83,9]},
       {label:"Absent",value:empStats.absent,bg:[254,226,226],fg:[138,28,55]},
       {label:"Leave",value:empStats.leave,bg:[224,231,255],fg:[98,48,104]}
      ].forEach((c,i)=>{
        const x=40+i*(cw+g);
        pdf.setFillColor(...c.bg); pdf.roundedRect(x,cy,cw,ch,8,8,"F");
        pdf.setFont("helvetica","bold"); pdf.setFontSize(22); pdf.setTextColor(...c.fg);
        pdf.text(String(c.value), x+cw/2, cy+28, {align:"center"});
        pdf.setFontSize(9); pdf.setFont("helvetica","normal"); pdf.setTextColor(100,116,139);
        pdf.text(c.label, x+cw/2, cy+44, {align:"center"});
      });

      const sorted = Object.entries(empDays).sort(([a],[b])=>a.localeCompare(b));
      pdf.autoTable({
        startY: cy+ch+20,
        head: [["#","Date","Day","Check In","Status"]],
        body: sorted.map(([ds,data],i)=>{
          const d=new Date(ds);
          return [i+1, d.toLocaleDateString("en-US",{day:"2-digit",month:"short",year:"numeric"}),
            d.toLocaleDateString("en-US",{weekday:"long"}), data.checkIn||"—", data.status||"—"];
        }),
        foot: [["","SUMMARY","","",`P:${empStats.present} L:${empStats.late} A:${empStats.absent} Lv:${empStats.leave}`]],
        theme:"grid",
        headStyles:{fillColor:[13,114,137],textColor:[255,255,255],fontStyle:"bold",halign:"center"},
        bodyStyles:{fontSize:11,halign:"center"},
        footStyles:{fillColor:[51,27,63],textColor:[245,240,229],fontStyle:"bold",fontSize:10,halign:"center"},
        alternateRowStyles:{fillColor:[250,246,240]},
        showFoot:"lastPage",
        didParseCell(d){
          if(d.section==="body"&&d.column.index===4){
            const s=d.cell.raw;
            if(s==="Present"){d.cell.styles.textColor=[21,128,61];d.cell.styles.fontStyle="bold";}
            if(s==="Late")   {d.cell.styles.textColor=[180,83,9]; d.cell.styles.fontStyle="bold";}
            if(s==="Absent") {d.cell.styles.textColor=[138,28,55];d.cell.styles.fontStyle="bold";}
            if(s==="Leave")  {d.cell.styles.textColor=[98,48,104];d.cell.styles.fontStyle="bold";}
          }
        },
        margin:{left:40,right:40},
      });

      addPdfFooter(pdf,pw);
      pdf.save(`${(selectedEmp.name||"Intern").replace(/\s+/g,"_")}_Intern_Attendance_${new Date().toISOString().slice(0,7)}.pdf`);
    } catch(e){ console.error(e); alert("PDF failed."); }
    finally { setPersonDl(false); }
  };

  /* ── PersonDetail view ──────────────────────────────── */
  const PersonDetail = () => {
    if (!selectedEmp) return null;
    const empDays  = dailyDetails[selectedEmp.id] || {};
    const empStats = monthlyStats[selectedEmp.id]  || { present:0, late:0, absent:0, leave:0 };
    const total    = empStats.present + empStats.late + empStats.absent + empStats.leave;
    const rate     = total > 0 ? Math.round(((empStats.present + empStats.late) / total) * 100) : 0;
    const ml       = new Date().toLocaleString("default",{month:"long",year:"numeric"});

    const daysList = Object.entries(empDays)
      .sort(([a],[b])=>a.localeCompare(b))
      .map(([ds,data])=>({
        dateStr:ds,
        dayName:   new Date(ds).toLocaleDateString("en-US",{weekday:"short"}),
        dateLabel: new Date(ds).toLocaleDateString("en-US",{day:"2-digit",month:"short"}),
        ...data,
      }));

    return (
      <div>
        {/* Back + download */}
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <button onClick={()=>setView("monthly")} style={{background:COLORS.textLight,border:`1.5px solid ${COLORS.accentGold}`,borderRadius:8,padding:"8px 16px",cursor:"pointer",fontWeight:700,color:COLORS.primaryPurple,fontSize:13}}>← Back</button>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:44,height:44,borderRadius:"50%",background:`linear-gradient(135deg,${COLORS.actionTeal},${COLORS.primaryDark})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:900,fontSize:18}}>{(selectedEmp.name||"?")[0].toUpperCase()}</div>
              <div>
                <h2 style={{margin:0,color:COLORS.textMain,fontSize:18,fontWeight:800}}>{selectedEmp.name}</h2>
                <div style={{color:COLORS.actionTeal,fontWeight:600,fontSize:13}}>{ml} · {selectedEmp.role}</div>
              </div>
            </div>
          </div>
          <button onClick={downloadPersonPDF} disabled={personDl} style={{background:personDl?"#94a3b8":COLORS.actionTeal,color:"#fff",border:"none",padding:"10px 20px",borderRadius:8,cursor:personDl?"not-allowed":"pointer",fontWeight:700,fontSize:13,display:"flex",alignItems:"center",gap:6}}>
            {personDl?"⏳ Generating...":"📄 Download Report"}
          </button>
        </div>

        {/* Rate bar */}
        <div style={{background:"#fff",borderRadius:12,padding:"18px 24px",marginBottom:18,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",borderLeft:`4px solid ${COLORS.actionTeal}`}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
            <span style={{fontWeight:700,color:COLORS.textMain,fontSize:14}}>Attendance Rate</span>
            <span style={{fontWeight:800,fontSize:18,color:COLORS.actionTeal}}>{rate}%</span>
          </div>
          <div style={{background:"#e0f2f7",borderRadius:99,height:10,overflow:"hidden"}}>
            <div style={{width:`${rate}%`,height:"100%",borderRadius:99,background:`linear-gradient(90deg,${COLORS.actionTeal},${COLORS.accentGold})`,transition:"width 0.6s ease"}}/>
          </div>
          <div style={{marginTop:8,color:"#64748b",fontSize:12}}><b style={{color:COLORS.textMain}}>{total}</b> days recorded this month</div>
        </div>

        {/* Stat cards */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14,marginBottom:22}}>
          {[
            {label:"Present",value:empStats.present,bg:"#dcfce7",color:"#15803d",icon:"✅"},
            {label:"Late",   value:empStats.late,   bg:"#fef3c7",color:"#b45309",icon:"⏰"},
            {label:"Absent", value:empStats.absent, bg:"#fee2e2",color:COLORS.secondaryRed,icon:"❌"},
            {label:"Leave",  value:empStats.leave,  bg:"#e0e7ff",color:COLORS.primaryPurple,icon:"📋"},
          ].map(c=>(
            <div key={c.label} style={{background:c.bg,borderRadius:12,padding:"18px 20px",boxShadow:"0 1px 4px rgba(0,0,0,0.05)"}}>
              <div style={{fontSize:22,marginBottom:4}}>{c.icon}</div>
              <div style={{fontSize:30,fontWeight:900,color:c.color}}>{c.value}</div>
              <div style={{fontSize:13,fontWeight:700,color:c.color,opacity:0.85}}>{c.label}</div>
            </div>
          ))}
        </div>

        {/* Day-by-day table */}
        <div style={{background:"#fff",borderRadius:12,boxShadow:"0 2px 8px rgba(0,0,0,0.06)",overflow:"hidden"}}>
          <div style={{padding:"16px 22px",borderBottom:"1px solid #f1f5f9",display:"flex",justifyContent:"space-between",alignItems:"center",background:COLORS.mainBgCream}}>
            <h3 style={{margin:0,color:COLORS.textMain,fontSize:15,fontWeight:800}}>Day-by-Day Breakdown</h3>
            <span style={{fontSize:12,color:COLORS.actionTeal,fontWeight:600}}>{daysList.length} days recorded</span>
          </div>
          {daysList.length===0 ? (
            <div style={{padding:40,textAlign:"center",color:"#94a3b8",fontSize:14}}>No records found for this month yet.</div>
          ) : (
            <div style={{maxHeight:420,overflowY:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead style={{background:"#f8fafc",position:"sticky",top:0,zIndex:1}}>
                  <tr>
                    <th style={thStyle}>#</th>
                    <th style={{...thStyle,textAlign:"left",paddingLeft:20}}>DATE</th>
                    <th style={thStyle}>DAY</th>
                    <th style={thStyle}>CHECK IN</th>
                    <th style={thStyle}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {daysList.map((day,idx)=>(
                    <tr key={day.dateStr} style={{borderBottom:"1px solid #f1f5f9",background:idx%2===0?"#fff":"#fafaf8"}}>
                      <td style={{...tdCenter,color:"#94a3b8",fontSize:13}}>{idx+1}</td>
                      <td style={{...tdStyle,fontWeight:600,fontSize:14}}>{day.dateLabel}</td>
                      <td style={{...tdCenter,color:"#64748b",fontSize:13,fontWeight:600}}>{day.dayName}</td>
                      <td style={{...tdCenter,fontFamily:"monospace",fontSize:13}}>{day.checkIn}</td>
                      <td style={tdCenter}><Badge status={day.status}/></td>
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

  if (loading) return <div style={{padding:50,textAlign:"center",color:COLORS.actionTeal,fontWeight:700,fontSize:16}}>Syncing with WellMind Cloud...</div>;

  return (
    <div style={{display:"flex",minHeight:"100vh",background:COLORS.mainBgCream,fontFamily:"'Segoe UI', sans-serif", }}>
      <div style={{width:"260px",flexShrink:0}}><Sidebar onNavigate={onNavigate}/></div>
      <div style={{flex:1,justifyContent: "center", // Content ko screen ke beech mein rakhega
    padding: "32px 40px",      // Sirf andar ke content ke liye padding
    overflowY: "auto" }}>

        {/* Header */}
        <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:28}}>
          <div>
            <h2 style={{margin:0,color:COLORS.primaryPurple,fontSize:24,fontWeight:800}}>
              {view==="daily"?"Intern Daily Attendance":view==="monthly"?"Intern Monthly Report":`${selectedEmp?.name}'s Detail`}
            </h2>
            <div style={{color:COLORS.secondaryRed,fontWeight:600,fontSize:14,marginTop:3}}>{new Date().toDateString()}</div>
          </div>
          <div style={{display:"flex",gap:12,alignItems:"center"}}>
            {view!=="person"&&(
              <>
                <button onClick={async()=>{ if(view==="daily") await goToMonthly(); else setView("daily"); }} style={{background:COLORS.actionTeal,color:"#fff",border:"none",padding:"10px 20px",borderRadius:8,cursor:"pointer",fontWeight:700,fontSize:13}}>
                  {view==="daily"?"📊 View Report":"📅 Today's Sheet"}
                </button>
                <button onClick={downloadMonthlyPDF} disabled={downloading} style={{background:downloading?"#94a3b8":COLORS.secondaryRed,color:"#fff",border:"none",padding:"10px 20px",borderRadius:8,cursor:downloading?"not-allowed":"pointer",fontWeight:700,fontSize:13}}>
                  {downloading?"⏳ Generating...":"📄 Export PDF"}
                </button>
              </>
            )}
            <div style={{background:"#fff",padding:"10px 18px",borderRadius:8,border:`2px solid ${COLORS.actionTeal}`,color:COLORS.actionTeal,fontWeight:800,fontSize:14}}>{currentTime}</div>
          </div>
        </header>

        {view==="person" ? <PersonDetail/> : (
          <div style={{background:"#fff",borderRadius:12,boxShadow:"0 4px 15px rgba(0,0,0,0.05)",overflow:"hidden",border:`1px solid rgba(98,48,104,0.12)`}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead style={{background:COLORS.mainBgCream}}>
                {view==="daily" ? (
                  <tr>
                    <th style={thStyle}>INTERN</th><th style={thStyle}>SCHEDULED</th><th style={thStyle}>CHECK IN</th>
                    <th style={thStyle}>PRESENT</th><th style={thStyle}>ABSENT</th><th style={thStyle}>LEAVE</th><th style={thStyle}>STATUS</th>
                  </tr>
                ) : (
                  <tr>
                    <th style={{...thStyle,textAlign:"left",paddingLeft:20}}>INTERN</th>
                    <th style={{...thStyle,color:"#16a34a"}}>PRESENT</th>
                    <th style={{...thStyle,color:"#b45309"}}>LATE</th>
                    <th style={{...thStyle,color:COLORS.secondaryRed}}>ABSENT</th>
                    <th style={{...thStyle,color:COLORS.primaryPurple}}>LEAVE</th>
                    <th style={thStyle}>TOTAL</th><th style={thStyle}>DETAILS</th>
                  </tr>
                )}
              </thead>
              <tbody>
                {records.map(r => view==="daily" ? (
                  <tr key={r.id} style={{borderBottom:"1px solid #f1f5f9"}}>
                    <td style={tdStyle}><b style={{color:COLORS.textMain}}>{r.name}</b><div style={{fontSize:12,color:"#94a3b8",marginTop:2}}>{r.role}</div></td>
                    <td style={tdCenter}>{r.scheduledIn}</td>
                    <td style={tdCenter}>{r.checkIn||"—"}</td>
                    <td style={tdCenter}><input type="checkbox" checked={r.status==="Present"||r.status==="Late"} onChange={()=>handleAttendance(r.id,r.scheduledIn,"Present")} style={{accentColor:COLORS.actionTeal,width:18,height:18,cursor:"pointer"}}/></td>
                    <td style={tdCenter}><input type="checkbox" checked={r.status==="Absent"} onChange={()=>handleAttendance(r.id,r.scheduledIn,"Absent")} style={{accentColor:COLORS.secondaryRed,width:18,height:18,cursor:"pointer"}}/></td>
                    <td style={tdCenter}><input type="checkbox" checked={r.status==="Leave"} onChange={()=>handleAttendance(r.id,r.scheduledIn,"Leave")} style={{accentColor:COLORS.accentGold,width:18,height:18,cursor:"pointer"}}/></td>
                    <td style={tdCenter}><Badge status={r.status}/></td>
                  </tr>
                ) : (
                  <tr key={r.id} style={{borderBottom:"1px solid #f1f5f9"}}>
                    <td style={{...tdStyle,display:"flex",alignItems:"center",gap:12}}>
                      <div style={{width:38,height:38,borderRadius:"50%",background:`linear-gradient(135deg,${COLORS.actionTeal},${COLORS.primaryDark})`,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:900,fontSize:15,flexShrink:0}}>{(r.name||"?")[0].toUpperCase()}</div>
                      <div><div style={{fontWeight:700,fontSize:14,color:COLORS.textMain}}>{r.name}</div><div style={{fontSize:12,color:"#94a3b8",marginTop:1}}>{r.role}</div></div>
                    </td>
                    <td style={tdCenter}><span style={{fontWeight:800,fontSize:15,color:"#15803d"}}>{monthlyStats[r.id]?.present||0}</span></td>
                    <td style={tdCenter}><span style={{fontWeight:800,fontSize:15,color:"#b45309"}}>{monthlyStats[r.id]?.late||0}</span></td>
                    <td style={tdCenter}><span style={{fontWeight:800,fontSize:15,color:COLORS.secondaryRed}}>{monthlyStats[r.id]?.absent||0}</span></td>
                    <td style={tdCenter}><span style={{fontWeight:800,fontSize:15,color:COLORS.primaryPurple}}>{monthlyStats[r.id]?.leave||0}</span></td>
                    <td style={tdCenter}><b style={{fontSize:15}}>{(monthlyStats[r.id]?.present||0)+(monthlyStats[r.id]?.late||0)+(monthlyStats[r.id]?.absent||0)+(monthlyStats[r.id]?.leave||0)}</b></td>
                    <td style={tdCenter}><button onClick={()=>openPersonView(r)} style={{background:"transparent",color:COLORS.actionTeal,border:`1.5px solid ${COLORS.actionTeal}`,borderRadius:8,padding:"7px 16px",fontSize:13,fontWeight:700,cursor:"pointer"}}>👁 View</button></td>
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

export default InternAttendance;