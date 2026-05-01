import React, { useState } from 'react';
import './App.css';
import Dashboard from './pages/Dashboard';
import Employees from './pages/Employees';
import Projects from './pages/Project';
import Attendance from './pages/Attendace';
import Interns from './pages/Interns';
import Achievements from './pages/Achievements';
import InternAttendance from './pages/InternAttendance';
import Login from './pages/Login';
import Signup from './pages/Signup';

const pages = {
  login: Login,    
  signup: Signup,            // ✅ Login added to the map             // ✅ Signup added to the map
  dashboard: Dashboard,
  employees: Employees,
  projects: Projects,
  attendance: Attendance,
  interns: Interns,
  achievements: Achievements,
  internAttendance: InternAttendance,
};

function App() {
  // ✅ 1. Changed initial state from 'dashboard' to 'login'
  const [currentPage, setCurrentPage] = useState('login');

  const PageComponent = pages[currentPage];

  return (
    <div className="app-container">
      {PageComponent ? (
        // ✅ 2. This passes 'setCurrentPage' as the 'onNavigate' prop
        <PageComponent onNavigate={setCurrentPage} />
      ) : (
        <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
          <h2>Page Not Found</h2>
          <p>Unknown page: "{currentPage}"</p>
          <button onClick={() => setCurrentPage('login')}>Go to Login</button>
        </div>
      )}
    </div>
  );
}

export default App;