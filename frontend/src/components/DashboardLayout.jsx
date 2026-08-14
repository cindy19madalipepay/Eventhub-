const DashboardLayout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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