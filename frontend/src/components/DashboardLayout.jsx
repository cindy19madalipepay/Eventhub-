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
      window.removeEventListener(
        'resize',
        handleResize
      );

  }, []);


  const toggleSidebar = () => {
    setSidebarCollapsed(prev => !prev);
  };


  /*
   * DESKTOP:
   * collapsed = 78px
   * expanded  = 260px
   *
   * MOBILE:
   * sidebar is either closed or opened.
   * It is no longer a 78px icon rail.
   */
  const sidebarWidth = isMobile
    ? '0px'
    : sidebarCollapsed
      ? '78px'
      : '260px';


  return (
    <div
      className={`dashboard-layout ${
        sidebarCollapsed
          ? 'sidebar-collapsed'
          : 'sidebar-expanded'
      } ${
        isMobile
          ? 'mobile-dashboard'
          : ''
      }`}
      style={{
        '--sidebar-w': sidebarWidth
      }}
    >

      {/* =================================================
          MOBILE TOP BAR
      ================================================= */}

      {isMobile && (
        <header className="mobile-topbar">

          <button
            type="button"
            className="mobile-menu-button"
            onClick={toggleSidebar}
            aria-label="Open menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>


          <div className="mobile-brand">

            <div className="mobile-brand-logo">
              EH
            </div>

            <div className="mobile-brand-text">
              <strong>
                EventHub
              </strong>

              <span>
                Student
              </span>
            </div>

          </div>

        </header>
      )}


      {/* =================================================
          MOBILE OVERLAY
      ================================================= */}

      {isMobile && !sidebarCollapsed && (
        <div
          className="mobile-sidebar-overlay"
          onClick={toggleSidebar}
        />
      )}


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