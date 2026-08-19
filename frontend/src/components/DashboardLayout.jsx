import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import './DashboardLayout.css';

const MOBILE_BREAKPOINT = 768;

const DashboardLayout = () => {

  const getIsMobile = () =>
    typeof window !== 'undefined' &&
    window.innerWidth <= MOBILE_BREAKPOINT;

  const [isMobile, setIsMobile] = useState(getIsMobile);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => getIsMobile()
  );

  useEffect(() => {

    let wasMobile = getIsMobile();

    const handleResize = () => {

      const nowMobile = getIsMobile();

      setIsMobile(nowMobile);

      if (nowMobile !== wasMobile) {
        wasMobile = nowMobile;
        setSidebarCollapsed(nowMobile);
      }
    };

    window.addEventListener('resize', handleResize);

    return () =>
      window.removeEventListener('resize', handleResize);

  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed(prev => !prev);
  };


  /* =========================================================
     SIDEBAR WIDTH

     Collapsed         -> 78px icon rail (desktop AND mobile)
     Expanded, mobile  -> 30% of the viewport. Content gets the
                          remaining 70% AUTOMATICALLY because
                          the layout below is flexbox, not
                          margin/calc-based — there is nothing
                          for these two numbers to fall out of
                          sync on.
     Expanded, desktop -> 260px fixed
  ========================================================= */

  const sidebarWidth = sidebarCollapsed
    ? '78px'
    : isMobile
      ? '30%'
      : '260px';


  return (
    <div
      className={`dashboard-layout ${
        sidebarCollapsed
          ? 'sidebar-collapsed'
          : 'sidebar-expanded'
      }`}
      style={{ '--sidebar-w': sidebarWidth }}
    >

      <Sidebar
        collapsed={sidebarCollapsed}
        isMobile={isMobile}
        onToggle={toggleSidebar}
      />

      <main className="main-content">
        <Outlet />
      </main>

    </div>
  );
};

export default DashboardLayout;