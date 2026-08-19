import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import './DashboardLayout.css';

const MOBILE_BREAKPOINT = 768;

const DashboardLayout = () => {

  /* =========================================================
     RESPONSIVE STATE

     isMobile         -> are we currently under the breakpoint
     sidebarCollapsed -> is the sidebar showing the slim icon
                         rail (true) or the full labeled view
                         (false)

     Both are driven from JS only. The actual pixel width of
     the sidebar is computed once, below, and passed down as a
     single CSS variable (--sidebar-w) that both the sidebar
     and the main content read from. This means there is only
     ONE place deciding the width — no more chance of CSS
     media queries and JS state disagreeing with each other.
  ========================================================= */

  const getIsMobile = () =>
    typeof window !== 'undefined' &&
    window.innerWidth <= MOBILE_BREAKPOINT;

  const [isMobile, setIsMobile] = useState(getIsMobile);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => getIsMobile()
  );


  /* =========================================================
     RESET ON BREAKPOINT CROSSING

     Only resets sidebarCollapsed when actually crossing the
     mobile/desktop breakpoint (e.g. rotating a tablet,
     resizing a browser window) — not on every resize event —
     so manually toggling the sidebar isn't undone by
     unrelated window resizes.
  ========================================================= */

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
     SIDEBAR WIDTH — single source of truth

     Fixed px values only (no vw units, which behave
     inconsistently across mobile browsers). This value is
     handed to both the sidebar and the main content via a CSS
     variable on the shared wrapper, so they can never fall out
     of sync with each other.
  ========================================================= */

  const sidebarWidth = sidebarCollapsed
    ? '78px'
    : isMobile
      ? '240px'
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