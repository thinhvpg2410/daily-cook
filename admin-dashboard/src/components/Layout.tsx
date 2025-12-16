import { ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard' },
    { path: '/users', label: 'Người dùng' },
    { path: '/recipes', label: 'Công thức' },
    { path: '/meal-plans', label: 'Kế hoạch bữa ăn' },
    { path: '/food-logs', label: 'Nhật ký ăn uống' },
    { path: '/ingredients', label: 'Nguyên liệu' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: '250px',
        background: '#1f2937',
        color: 'white',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <h2 style={{ marginBottom: '2rem', fontSize: '1.5rem' }}>Admin Panel</h2>
        <nav style={{ flex: 1 }}>
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              style={{
                display: 'block',
                padding: '0.75rem 1rem',
                marginBottom: '0.5rem',
                borderRadius: '4px',
                textDecoration: 'none',
                color: location.pathname === item.path ? '#fff' : '#d1d5db',
                background: location.pathname === item.path ? '#3b82f6' : 'transparent',
                transition: 'all 0.2s'
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div style={{ borderTop: '1px solid #374151', paddingTop: '1rem' }}>
          <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: '#9ca3af' }}>
            {user?.email}
          </div>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, background: '#f9fafb', padding: '2rem' }}>
        {children}
      </main>
    </div>
  );
}

