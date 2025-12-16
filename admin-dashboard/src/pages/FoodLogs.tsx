import { useEffect, useState } from 'react';
import { adminApi } from '../api/admin';
import type { FoodLog } from '../api/admin';

export default function FoodLogs() {
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    fetchFoodLogs();
  }, [page]);

  const fetchFoodLogs = async () => {
    setLoading(true);
    try {
      const response = await adminApi.getFoodLogs({ page, limit });
      setFoodLogs(response.data);
      setTotal(response.total);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể tải danh sách nhật ký ăn uống');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: '2rem', fontSize: '2rem', color: '#1f2937' }}>Nhật ký Ăn uống</h1>

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
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Bữa ăn</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Recipe ID</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Kcal</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Protein</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Fat</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Carbs</th>
                </tr>
              </thead>
              <tbody>
                {foodLogs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '0.75rem' }}>{log.userId}</td>
                    <td style={{ padding: '0.75rem' }}>
                      {new Date(log.date).toLocaleDateString('vi-VN')}
                    </td>
                    <td style={{ padding: '0.75rem' }}>{log.mealType}</td>
                    <td style={{ padding: '0.75rem' }}>{log.recipeId || '-'}</td>
                    <td style={{ padding: '0.75rem' }}>{log.kcal ? Math.round(log.kcal) : '-'}</td>
                    <td style={{ padding: '0.75rem' }}>{log.protein ? Math.round(log.protein) : '-'}</td>
                    <td style={{ padding: '0.75rem' }}>{log.fat ? Math.round(log.fat) : '-'}</td>
                    <td style={{ padding: '0.75rem' }}>{log.carbs ? Math.round(log.carbs) : '-'}</td>
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

