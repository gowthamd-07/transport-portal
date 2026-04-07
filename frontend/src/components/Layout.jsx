import { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Truck, LayoutDashboard, PlusCircle, List, Users, LogOut, User, Database, Menu, X } from 'lucide-react';

export default function Layout() {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { to: '/create-trip', label: 'Create Trip', icon: <PlusCircle size={18} /> },
    { to: '/trips', label: 'All Trips', icon: <List size={18} /> },
  ];

  if (isAdmin) {
    navItems.push({ to: '/master-data', label: 'Master Data', icon: <Database size={18} /> });
    navItems.push({ to: '/users', label: 'User Management', icon: <Users size={18} /> });
  }

  return (
    <div className="layout">
      <header className="mobile-header">
        <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
          <Menu size={22} />
        </button>
        <div className="mobile-brand">
          <Truck size={20} />
          <span>TransFleet Pro</span>
        </div>
        <div className="mobile-avatar">
          <User size={16} />
        </div>
      </header>

      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <Truck size={26} />
          <div>
            <h1>TransFleet Pro</h1>
            <span>Transport Management</span>
          </div>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="avatar">
              <User size={18} />
            </div>
            <div className="user-info">
              <p className="user-name">{user?.full_name}</p>
              <p className="user-role">{user?.role === 'admin' ? 'Administrator' : 'Fleet Operator'}</p>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout} title="Logout">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <div className="main-area">
        <Outlet />
      </div>
    </div>
  );
}
