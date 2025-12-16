import { useEffect, useState } from 'react';
import { adminApi } from '../api/admin';
import type { Ingredient } from '../api/admin';

export default function Ingredients() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const limit = 20;

  useEffect(() => {
    fetchIngredients();
  }, [page, search]);

  const fetchIngredients = async () => {
    setLoading(true);
    try {
      const response = await adminApi.getIngredients({ page, limit, search: search || undefined });
      setIngredients(response.data);
      setTotal(response.total);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể tải danh sách nguyên liệu');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa nguyên liệu này?')) return;
    try {
      await adminApi.deleteIngredient(id);
      fetchIngredients();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể xóa nguyên liệu');
    }
  };

  const handleEdit = (ingredient: Ingredient) => {
    setEditingIngredient(ingredient);
    setShowModal(true);
  };

  const handleCreate = () => {
    setEditingIngredient(null);
    setShowModal(true);
  };

  const handleFetchPrice = async (id: string) => {
    if (!confirm('Bạn có muốn lấy giá mới từ thị trường?')) return;
    try {
      await adminApi.fetchIngredientPrice(id);
      alert('Đã cập nhật giá thành công!');
      fetchIngredients();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể lấy giá');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', color: '#1f2937' }}>Quản lý Nguyên liệu</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <input
            type="text"
            placeholder="Tìm kiếm..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            style={{
              padding: '0.5rem 1rem',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontSize: '1rem'
            }}
          />
          <button
            onClick={handleCreate}
            style={{
              padding: '0.5rem 1rem',
              background: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            + Thêm mới
          </button>
        </div>
      </div>

      {error && <div style={{ color: 'red', marginBottom: '1rem' }}>{error}</div>}

      {loading ? (
        <div>Đang tải...</div>
      ) : (
        <>
          <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Tên</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Đơn vị</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Kcal</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Protein</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Fat</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Carbs</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Giá</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {ingredients.map((ingredient) => (
                  <tr key={ingredient.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '0.75rem' }}>{ingredient.name}</td>
                    <td style={{ padding: '0.75rem' }}>{ingredient.unit || '-'}</td>
                    <td style={{ padding: '0.75rem' }}>{ingredient.kcal ? Math.round(ingredient.kcal) : '-'}</td>
                    <td style={{ padding: '0.75rem' }}>{ingredient.protein ? Math.round(ingredient.protein) : '-'}</td>
                    <td style={{ padding: '0.75rem' }}>{ingredient.fat ? Math.round(ingredient.fat) : '-'}</td>
                    <td style={{ padding: '0.75rem' }}>{ingredient.carbs ? Math.round(ingredient.carbs) : '-'}</td>
                    <td style={{ padding: '0.75rem' }}>
                      {ingredient.pricePerUnit ? `${ingredient.pricePerUnit} ${ingredient.priceCurrency || 'VND'}` : '-'}
                    </td>
                    <td style={{ padding: '0.75rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => handleFetchPrice(ingredient.id)}
                        style={{
                          padding: '0.25rem 0.75rem',
                          background: '#f59e0b',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '0.875rem'
                        }}
                        title="Lấy giá từ thị trường"
                      >
                        💰 Lấy giá
                      </button>
                      <button
                        onClick={() => handleEdit(ingredient)}
                        style={{
                          padding: '0.25rem 0.75rem',
                          background: '#3b82f6',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(ingredient.id)}
                        style={{
                          padding: '0.25rem 0.75rem',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        Xóa
                      </button>
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

      {showModal && (
        <IngredientModal
          ingredient={editingIngredient}
          onClose={() => {
            setShowModal(false);
            setEditingIngredient(null);
          }}
          onSave={() => {
            setShowModal(false);
            setEditingIngredient(null);
            fetchIngredients();
          }}
        />
      )}
    </div>
  );
}

function IngredientModal({ ingredient, onClose, onSave }: { ingredient: Ingredient | null; onClose: () => void; onSave: () => void }) {
  const [formData, setFormData] = useState({
    name: ingredient?.name || '',
    unit: ingredient?.unit || '',
    kcal: ingredient?.kcal || 0,
    protein: ingredient?.protein || 0,
    fat: ingredient?.fat || 0,
    carbs: ingredient?.carbs || 0,
    fiber: ingredient?.fiber || 0,
    sugar: ingredient?.sugar || 0,
    sodium: ingredient?.sodium || 0,
    pricePerUnit: ingredient?.pricePerUnit || 0,
    priceCurrency: ingredient?.priceCurrency || 'VND',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (ingredient) {
        await adminApi.updateIngredient(ingredient.id, formData);
      } else {
        await adminApi.createIngredient(formData);
      }
      onSave();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể lưu nguyên liệu');
    }
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
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        padding: '2rem',
        borderRadius: '8px',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <h2 style={{ marginBottom: '1.5rem' }}>
          {ingredient ? 'Sửa nguyên liệu' : 'Thêm nguyên liệu mới'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Tên *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Đơn vị</label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Kcal</label>
              <input
                type="number"
                value={formData.kcal}
                onChange={(e) => setFormData({ ...formData, kcal: parseFloat(e.target.value) || 0 })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Protein (g)</label>
              <input
                type="number"
                value={formData.protein}
                onChange={(e) => setFormData({ ...formData, protein: parseFloat(e.target.value) || 0 })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Fat (g)</label>
              <input
                type="number"
                value={formData.fat}
                onChange={(e) => setFormData({ ...formData, fat: parseFloat(e.target.value) || 0 })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Carbs (g)</label>
              <input
                type="number"
                value={formData.carbs}
                onChange={(e) => setFormData({ ...formData, carbs: parseFloat(e.target.value) || 0 })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Giá</label>
              <input
                type="number"
                value={formData.pricePerUnit}
                onChange={(e) => setFormData({ ...formData, pricePerUnit: parseFloat(e.target.value) || 0 })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Đơn vị tiền tệ</label>
              <select
                value={formData.priceCurrency}
                onChange={(e) => setFormData({ ...formData, priceCurrency: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
              >
                <option value="VND">VND</option>
                <option value="USD">USD</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Hủy
            </button>
            <button
              type="submit"
              style={{
                padding: '0.5rem 1rem',
                background: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

