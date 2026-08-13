import { useState } from 'react';
import { Outlet } from 'react-router-dom';

import Sidebar from '../components/Sidebar';

import './DashboardLayout.css';


const DashboardLayout = () => {

  const [collapsed, setCollapsed] = useState(false);

  const [mobileOpen, setMobileOpen] = useState(false);


  return (
    <div
      className={`
        dashboard-layout
        ${collapsed ? 'layout-sidebar-collapsed' : ''}
      `}
    >

      <Sidebar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
      />


      <main className="main-content">

        <Outlet />

      </main>

    </div>
  );
};


export default DashboardLayout;