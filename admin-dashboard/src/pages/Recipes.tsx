import { useEffect, useState } from 'react';
import { adminApi } from '../api/admin';
import type { Recipe } from '../api/admin';
import RecipeForm from '../components/RecipeForm';

export default function Recipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const limit = 20;

  useEffect(() => {
    fetchRecipes();
  }, [page, search]);

  const fetchRecipes = async () => {
    setLoading(true);
    try {
      const response = await adminApi.getRecipes({ page, limit, search: search || undefined });
      setRecipes(response.data);
      setTotal(response.total);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể tải danh sách công thức');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingRecipe(null);
    setShowModal(true);
  };

  const handleEdit = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setShowModal(true);
  };

  const handleDelete = async (recipeId: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa công thức này?')) return;
    try {
      await adminApi.deleteRecipe(recipeId);
      fetchRecipes();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể xóa công thức');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', color: '#1f2937' }}>Quản lý Công thức</h1>
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
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Tiêu đề</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Vùng</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Thời gian nấu</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Lượt thích</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Kcal</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Tags</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Ngày tạo</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {recipes.map((recipe) => (
                  <tr key={recipe.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '0.75rem' }}>{recipe.title}</td>
                    <td style={{ padding: '0.75rem' }}>{recipe.region || '-'}</td>
                    <td style={{ padding: '0.75rem' }}>{recipe.cookTime ? `${recipe.cookTime} phút` : '-'}</td>
                    <td style={{ padding: '0.75rem' }}>{recipe.likes || 0}</td>
                    <td style={{ padding: '0.75rem' }}>{recipe.totalKcal ? Math.round(recipe.totalKcal) : '-'}</td>
                    <td style={{ padding: '0.75rem' }}>
                      {recipe.tags.slice(0, 3).join(', ')}
                      {recipe.tags.length > 3 && '...'}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {new Date(recipe.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td style={{ padding: '0.75rem', display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleEdit(recipe)}
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
                        onClick={() => handleDelete(recipe.id)}
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
        <RecipeForm
          recipe={editingRecipe}
          onClose={() => {
            setShowModal(false);
            setEditingRecipe(null);
          }}
          onSave={() => {
            setShowModal(false);
            setEditingRecipe(null);
            fetchRecipes();
          }}
        />
      )}
    </div>
  );
}

