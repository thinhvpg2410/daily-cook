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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
        {stats.recentUsers && stats.recentUsers.length > 0 && (
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem', color: '#1f2937' }}>
              Người dùng mới nhất
            </h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: '#6b7280', fontSize: '0.875rem' }}>Email</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: '#6b7280', fontSize: '0.875rem' }}>Tên</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', color: '#6b7280', fontSize: '0.875rem' }}>Ngày tạo</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentUsers.slice(0, 5).map((user) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{user.email}</td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>{user.name || '-'}</td>
                    <td style={{ padding: '0.75rem', fontSize: '0.875rem' }}>
                      {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {stats.recentRecipes && stats.recentRecipes.length > 0 && (
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.25rem', color: '#1f2937' }}>
              Công thức mới nhất
            </h2>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {stats.recentRecipes.map((recipe) => (
                <div
                  key={recipe.id}
                  style={{
                    display: 'flex',
                    gap: '1rem',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    transition: 'all 0.2s',
                    cursor: 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f9fafb';
                    e.currentTarget.style.borderColor = '#3b82f6';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }}
                >
                  {recipe.image ? (
                    <img
                      src={recipe.image}
                      alt={recipe.title}
                      style={{
                        width: '80px',
                        height: '80px',
                        objectFit: 'cover',
                        borderRadius: '6px',
                        border: '1px solid #e5e7eb'
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div style={{
                      width: '80px',
                      height: '80px',
                      background: '#f3f4f6',
                      borderRadius: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#9ca3af',
                      fontSize: '0.75rem',
                      textAlign: 'center'
                    }}>
                      No Image
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: '600', marginBottom: '0.25rem', color: '#1f2937', fontSize: '0.875rem' }}>
                      {recipe.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                      {recipe.region === 'Northern' ? 'Miền Bắc' :
                       recipe.region === 'Central' ? 'Miền Trung' :
                       recipe.region === 'Southern' ? 'Miền Nam' : ''}
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#6b7280' }}>
                      {recipe.totalKcal && (
                        <span>🔥 {Math.round(recipe.totalKcal)} kcal</span>
                      )}
                      {recipe.likes && recipe.likes > 0 && (
                        <span>❤️ {recipe.likes}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

