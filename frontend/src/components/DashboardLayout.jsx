import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import './DashboardLayout.css';

const MOBILE_BREAKPOINT = 768;

const DashboardLayout = () => {

  /* =========================================================
     INITIAL SIDEBAR STATE

     On desktop we default to "expanded" (pushes content over),
     same as before. On mobile we now default to "collapsed"
     (the slim 78px icon rail) so the content area gets the
     full screen width right away — matching desktop, instead
     of being permanently squeezed into 50vw.
  ========================================================= */

  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.innerWidth <= MOBILE_BREAKPOINT
  );


  /* =========================================================
     RESET ON BREAKPOINT CROSSING

     If the window is resized across the mobile/desktop
     breakpoint (e.g. rotating a tablet, resizing a browser),
     reset to that layout's sane default instead of leaving the
     sidebar stuck mid-overlay or mid-push. We only reset when
     actually crossing the breakpoint, not on every resize
     event, so manually toggling the sidebar on desktop isn't
     undone by unrelated window resizes.
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

      {/* =================================================
          MOBILE BACKDROP

          Only visible on mobile (hidden via CSS on desktop),
          and only rendered while the sidebar is open. Dims the
          content behind the sidebar overlay; tapping it closes
          the sidebar the same as the hamburger does.
      ================================================= */}

      {!sidebarCollapsed && (
        <div
          className="sidebar-backdrop"
          onClick={toggleSidebar}
          aria-hidden="true"
        />
      )}

      <main className="main-content">
        <Outlet />
      </main>

    </div>
  );
};

export default DashboardLayout;