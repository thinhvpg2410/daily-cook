import { useEffect, useState } from 'react';
import { adminApi } from '../api/admin';
import type { MealPlan } from '../api/admin';

export default function MealPlans() {
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchMealPlans();
  }, [page]);

  const fetchMealPlans = async () => {
    setLoading(true);
    try {
      const response = await adminApi.getMealPlans({ page, limit });
      setMealPlans(response.data);
      setTotal(response.total);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể tải danh sách kế hoạch bữa ăn');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: '2rem', fontSize: '2rem', color: '#1f2937' }}>Kế hoạch Bữa ăn</h1>

      {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}

      {loading ? (
        <div>Đang tải...</div>
      ) : (
        <>
          <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>User ID</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Ngày</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Tổng Kcal</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Ghi chú</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Ngày tạo</th>
                </tr>
              </thead>
              <tbody>
                {mealPlans.map((plan) => (
                  <tr key={plan.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '0.75rem' }}>{plan.userId}</td>
                    <td style={{ padding: '0.75rem' }}>
                      {new Date(plan.date).toLocaleDateString('vi-VN')}
                    </td>
                    <td style={{ padding: '0.75rem' }}>{plan.totalKcal ? Math.round(plan.totalKcal) : '-'}</td>
                    <td style={{ padding: '0.75rem' }}>{plan.note || '-'}</td>
                    <td style={{ padding: '0.75rem' }}>
                      {new Date(plan.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              Hiển thị {(page - 1) * limit + 1} - {Math.min(page * limit, total)} / {total}
            </div>
            <div>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: '0.5rem 1rem',
                  marginRight: '0.5rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: page === 1 ? 'not-allowed' : 'pointer'
                }}
              >
                Trước
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * limit >= total}
                style={{
                  padding: '0.5rem 1rem',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: page * limit >= total ? 'not-allowed' : 'pointer'
                }}
              >
                Sau
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

