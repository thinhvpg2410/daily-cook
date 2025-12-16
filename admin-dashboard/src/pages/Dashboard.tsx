import { useEffect, useState } from 'react';
import { adminApi } from '../api/admin';
import type { DashboardStats } from '../api/admin';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await adminApi.getStats();
        setStats(data);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Không thể tải thống kê');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return <div>Đang tải...</div>;
  }

  if (error) {
    return <div style={{ color: 'red' }}>{error}</div>;
  }

  if (!stats) {
    return <div>Không có dữ liệu</div>;
  }

  const statCards = [
    { label: 'Tổng người dùng', value: stats.totalUsers, color: '#3b82f6' },
    { label: 'Tổng công thức', value: stats.totalRecipes, color: '#10b981' },
    { label: 'Tổng kế hoạch bữa ăn', value: stats.totalMealPlans, color: '#f59e0b' },
    { label: 'Tổng nhật ký ăn uống', value: stats.totalFoodLogs, color: '#ef4444' },
    { label: 'Người dùng hoạt động', value: stats.activeUsers, color: '#8b5cf6' },
  ];

  return (
    <div>
      <h1 style={{ marginBottom: '2rem', fontSize: '2rem', color: '#1f2937' }}>
        Dashboard
      </h1>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {statCards.map((card) => (
          <div
            key={card.label}
            style={{
              background: 'white',
              padding: '1.5rem',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              borderLeft: `4px solid ${card.color}`
            }}
          >
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
              {card.label}
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#1f2937' }}>
              {card.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {stats.recentUsers && stats.recentUsers.length > 0 && (
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem', color: '#1f2937' }}>
            Người dùng mới nhất
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: '#6b7280' }}>Email</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: '#6b7280' }}>Tên</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: '#6b7280' }}>Số điện thoại</th>
                <th style={{ padding: '0.75rem', textAlign: 'left', color: '#6b7280' }}>Ngày tạo</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentUsers.map((user) => (
                <tr key={user.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '0.75rem' }}>{user.email}</td>
                  <td style={{ padding: '0.75rem' }}>{user.name || '-'}</td>
                  <td style={{ padding: '0.75rem' }}>{user.phone}</td>
                  <td style={{ padding: '0.75rem' }}>
                    {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

