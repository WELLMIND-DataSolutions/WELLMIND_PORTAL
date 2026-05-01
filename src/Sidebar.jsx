import React from 'react';

const Sidebar = ({ activeNav, onNavigate }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'employees', label: 'Employees', icon: 'employees' },
     { id: 'interns', label: 'Interns', icon: 'employees' },
    { id: 'attendance', label: 'Attendance', icon: 'attendance' },
    { id: 'internAttendance', label: 'Intern Attendance', icon: 'interns' },
    { id: 'projects', label: 'Projects', icon: 'projects' },
    { id: 'achievements', label: 'Achievements', icon: 'trophy' },
   
  ];

  const handleNavClick = (id) => {
    if (onNavigate) {
      onNavigate(id);
    }
  };

  const renderIcon = (type, size = 20) => {
    const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
    switch (type) {
      case 'dashboard':
        return <svg {...props}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>;
      case 'employees':
        return <svg {...props}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
      case 'projects':
        return <svg {...props}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>;
      case 'attendance':
        return <svg {...props}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
      case 'interns':
        return (
          <svg {...props}>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <polyline points="16 11 18 13 22 9" />
          </svg>
        );
      // ✅ YE NEW ADD KIYA — trophy icon missing tha
      case 'trophy':
        return <svg {...props}><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>;
      case 'tasks':
        return <svg {...props}><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>;
      case 'reports':
        return <svg {...props}><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;
      default:
        return null;
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
      <img 
    src="./hero.png" 
    alt="WellMind Data Solutions" 
    style={{ 
        height: '40px', 
        width: 'auto', 
        objectFit: 'contain',
        backgroundColor: '#FFFFFF', // White background
        padding: '4px',             // Thodi si space logo ke charon taraf
        borderRadius: '4px'         // Optional: kinaro ko thora round karne ke liye
    }} 
/>
        <span>Office House</span>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item.id}
            className={`nav-item${activeNav === item.id ? ' active' : ''}`}
            onClick={() => handleNavClick(item.id)}
          >
            {renderIcon(item.icon)}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

     <div className="sidebar-footer">
        {/* Added onClick to trigger onNavigate('login') */}
         <button className="nav-item" onClick={() => handleNavClick('login')}>
           <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
             <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
           </svg>
           <span>Log Out</span>
         </button>
      </div>
    </aside>
  );
};

export default Sidebar;