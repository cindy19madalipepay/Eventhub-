import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import './DashboardLayout.css';

const MOBILE_BREAKPOINT = 768;

const DashboardLayout = () => {

  /* =========================================================
     INITIAL SIDEBAR STATE

     Desktop defaults to "expanded" (pushes content over), same
     as before. Mobile now also just PUSHES content over — same
     behavior as desktop, not an overlay — but starts collapsed
     (the slim 78px icon rail) so the content gets the full
     screen width on load, matching the screenshot you sent.
  ========================================================= */

  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.innerWidth <= MOBILE_BREAKPOINT
  );


  /* =========================================================
     RESET ON BREAKPOINT CROSSING

     Only resets when actually crossing the mobile/desktop
     breakpoint (e.g. rotating a tablet, resizing a browser),
     not on every resize event — so manually toggling the
     sidebar isn't undone by unrelated window resizes.
  ========================================================= */

  useEffect(() => {

    let wasMobile =
      window.innerWidth <= MOBILE_BREAKPOINT;

    const handleResize = () => {

      const isMobile =
        window.innerWidth <= MOBILE_BREAKPOINT;

      if (isMobile !== wasMobile) {
        wasMobile = isMobile;
        setSidebarCollapsed(isMobile);
      }
    };

    window.addEventListener('resize', handleResize);

    return () =>
      window.removeEventListener('resize', handleResize);

  }, []);


  const toggleSidebar = () => {
    setSidebarCollapsed(prev => !prev);
  };


  return (
    <div
      className={`dashboard-layout ${
        sidebarCollapsed
          ? 'sidebar-collapsed'
          : 'sidebar-expanded'
      }`}
    >

      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={toggleSidebar}
      />

      <main className="main-content">
        <Outlet />
      </main>

    </div>
  );
};

export default DashboardLayout;