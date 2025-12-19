import { useEffect, useState } from 'react';
import { adminApi } from '../api/admin';
import type { MealPlan } from '../api/admin';

export default function MealPlans() {
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedMealPlan, setSelectedMealPlan] = useState<MealPlan | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
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

  const handleRowClick = async (mealPlanId: string) => {
    try {
      const mealPlan = await adminApi.getMealPlan(mealPlanId);
      setSelectedMealPlan(mealPlan);
      setShowDetailModal(true);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể tải chi tiết kế hoạch bữa ăn');
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
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Người dùng</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Email</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Ngày</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Tổng Kcal</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Ghi chú</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Ngày tạo</th>
                </tr>
              </thead>
              <tbody>
                {mealPlans.map((plan) => (
                  <tr 
                    key={plan.id} 
                    style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
                    onClick={() => handleRowClick(plan.id)}
                  >
                    <td style={{ padding: '0.75rem' }}>
                      {plan.user?.name || plan.userId}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {plan.user?.email || '-'}
                    </td>
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

      {showDetailModal && selectedMealPlan && (
        <MealPlanDetailModal
          mealPlan={selectedMealPlan}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedMealPlan(null);
          }}
        />
      )}
    </div>
  );
}

function MealPlanDetailModal({ mealPlan, onClose }: { mealPlan: MealPlan; onClose: () => void }) {
  const slots = mealPlan.slots as any;
  const recipes = mealPlan.recipes || {};

  const getRecipeTitle = (recipeId: string) => {
    return recipes[recipeId]?.title || recipeId;
  };

  const getRecipeImage = (recipeId: string) => {
    return recipes[recipeId]?.image;
  };

  const getRecipeKcal = (recipeId: string) => {
    return recipes[recipeId]?.totalKcal;
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '2rem'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '900px',
        maxHeight: '90vh',
        overflow: 'auto',
        position: 'relative',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: '#f3f4f6',
            border: 'none',
            borderRadius: '50%',
            width: '2.5rem',
            height: '2.5rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            color: '#6b7280',
            zIndex: 10
          }}
        >
          ×
        </button>

        <div style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#1f2937' }}>
            Kế hoạch Bữa ăn
          </h2>

          {/* User Info */}
          <div style={{ marginBottom: '2rem', padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Người dùng</div>
            <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937' }}>
              {mealPlan.user?.name || mealPlan.userId}
            </div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
              {mealPlan.user?.email || '-'}
            </div>
          </div>

          {/* Date and Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Ngày</div>
              <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937' }}>
                {new Date(mealPlan.date).toLocaleDateString('vi-VN', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            </div>
            <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Tổng Kcal</div>
              <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937' }}>
                {mealPlan.totalKcal ? Math.round(mealPlan.totalKcal) : '-'}
              </div>
            </div>
          </div>

          {/* Meals */}
          <div style={{ marginBottom: '2rem' }}>
            {/* Breakfast */}
            {slots?.breakfast && Array.isArray(slots.breakfast) && slots.breakfast.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>🌅</span> Bữa sáng
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                  {slots.breakfast.map((recipeId: string, idx: number) => (
                    <div key={idx} style={{
                      padding: '1rem',
                      background: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      {getRecipeImage(recipeId) && (
                        <img 
                          src={getRecipeImage(recipeId) || ''} 
                          alt={getRecipeTitle(recipeId)}
                          style={{
                            width: '100%',
                            height: '120px',
                            objectFit: 'cover',
                            borderRadius: '6px',
                            marginBottom: '0.75rem'
                          }}
                        />
                      )}
                      <div style={{ fontWeight: '500', marginBottom: '0.25rem', color: '#1f2937' }}>
                        {getRecipeTitle(recipeId)}
                      </div>
                      {getRecipeKcal(recipeId) && (
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                          {Math.round(getRecipeKcal(recipeId) || 0)} Kcal
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lunch */}
            {slots?.lunch && Array.isArray(slots.lunch) && slots.lunch.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>☀️</span> Bữa trưa
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                  {slots.lunch.map((recipeId: string, idx: number) => (
                    <div key={idx} style={{
                      padding: '1rem',
                      background: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      {getRecipeImage(recipeId) && (
                        <img 
                          src={getRecipeImage(recipeId) || ''} 
                          alt={getRecipeTitle(recipeId)}
                          style={{
                            width: '100%',
                            height: '120px',
                            objectFit: 'cover',
                            borderRadius: '6px',
                            marginBottom: '0.75rem'
                          }}
                        />
                      )}
                      <div style={{ fontWeight: '500', marginBottom: '0.25rem', color: '#1f2937' }}>
                        {getRecipeTitle(recipeId)}
                      </div>
                      {getRecipeKcal(recipeId) && (
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                          {Math.round(getRecipeKcal(recipeId) || 0)} Kcal
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dinner */}
            {slots?.dinner && Array.isArray(slots.dinner) && slots.dinner.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#1f2937', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>🌙</span> Bữa chiều
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                  {slots.dinner.map((recipeId: string, idx: number) => (
                    <div key={idx} style={{
                      padding: '1rem',
                      background: '#f9fafb',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb'
                    }}>
                      {getRecipeImage(recipeId) && (
                        <img 
                          src={getRecipeImage(recipeId) || ''} 
                          alt={getRecipeTitle(recipeId)}
                          style={{
                            width: '100%',
                            height: '120px',
                            objectFit: 'cover',
                            borderRadius: '6px',
                            marginBottom: '0.75rem'
                          }}
                        />
                      )}
                      <div style={{ fontWeight: '500', marginBottom: '0.25rem', color: '#1f2937' }}>
                        {getRecipeTitle(recipeId)}
                      </div>
                      {getRecipeKcal(recipeId) && (
                        <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                          {Math.round(getRecipeKcal(recipeId) || 0)} Kcal
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(!slots?.breakfast || slots.breakfast.length === 0) && 
             (!slots?.lunch || slots.lunch.length === 0) && 
             (!slots?.dinner || slots.dinner.length === 0) && (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280', background: '#f9fafb', borderRadius: '8px' }}>
                Chưa có món ăn nào trong kế hoạch này
              </div>
            )}
          </div>

          {/* Note */}
          {mealPlan.note && (
            <div style={{ marginBottom: '2rem', padding: '1rem', background: '#fef3c7', borderRadius: '8px', border: '1px solid #fde68a' }}>
              <div style={{ fontSize: '0.875rem', color: '#92400e', marginBottom: '0.5rem', fontWeight: '500' }}>Ghi chú</div>
              <div style={{ color: '#78350f' }}>{mealPlan.note}</div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500'
              }}
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
