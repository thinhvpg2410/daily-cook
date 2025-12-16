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
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    region: '',
    tag: '',
    minCookTime: '',
    maxCookTime: '',
  });
  const limit = 20;

  useEffect(() => {
    fetchRecipes();
    fetchTags();
  }, [page, search, filters]);

  const fetchTags = async () => {
    try {
      const tags = await adminApi.getAllTags();
      setAvailableTags(tags);
    } catch (err) {
      console.error('Failed to fetch tags:', err);
    }
  };

  const fetchRecipes = async () => {
    setLoading(true);
    try {
      const response = await adminApi.getRecipes({ page, limit, search: search || undefined });
      let filtered = response.data;
      
      // Apply filters
      if (filters.region) {
        filtered = filtered.filter(r => r.region === filters.region);
      }
      if (filters.tag) {
        filtered = filtered.filter(r => r.tags.includes(filters.tag));
      }
      if (filters.minCookTime) {
        filtered = filtered.filter(r => r.cookTime && r.cookTime >= parseInt(filters.minCookTime));
      }
      if (filters.maxCookTime) {
        filtered = filtered.filter(r => r.cookTime && r.cookTime <= parseInt(filters.maxCookTime));
      }
      
      setRecipes(filtered);
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

  const handleEdit = (e: React.MouseEvent, recipe: Recipe) => {
    e.stopPropagation();
    setEditingRecipe(recipe);
    setShowModal(true);
  };

  const handleViewDetail = async (recipe: Recipe) => {
    try {
      const fullRecipe = await adminApi.getRecipe(recipe.id);
      setSelectedRecipe(fullRecipe as any);
      setShowDetailModal(true);
    } catch (err: any) {
      alert('Không thể tải chi tiết công thức');
    }
  };

  const handleDelete = (e: React.MouseEvent, recipeId: string) => {
    e.stopPropagation();
    if (!confirm('Bạn có chắc chắn muốn xóa công thức này?')) return;
    adminApi.deleteRecipe(recipeId).then(() => {
      fetchRecipes();
    }).catch((err: any) => {
      alert(err.response?.data?.message || 'Không thể xóa công thức');
    });
  };

  const clearFilters = () => {
    setFilters({ region: '', tag: '', minCookTime: '', maxCookTime: '' });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', color: '#1f2937' }}>Quản lý Công thức</h1>
        <button
          onClick={handleCreate}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '1rem',
            fontWeight: '500',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}
        >
          + Thêm mới
        </button>
      </div>

      {/* Search and Filters */}
      <div style={{ 
        background: 'white', 
        padding: '1.5rem', 
        borderRadius: '8px', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr auto', gap: '1rem', alignItems: 'end' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
              Tìm kiếm
            </label>
            <input
              type="text"
              placeholder="Tên món ăn, mô tả..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '1rem'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
              Vùng miền
            </label>
            <select
              value={filters.region}
              onChange={(e) => {
                setFilters({ ...filters, region: e.target.value });
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '1rem'
              }}
            >
              <option value="">Tất cả</option>
              <option value="Northern">Miền Bắc</option>
              <option value="Central">Miền Trung</option>
              <option value="Southern">Miền Nam</option>
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
              Thời gian tối thiểu (phút)
            </label>
            <input
              type="number"
              placeholder="0"
              value={filters.minCookTime}
              onChange={(e) => {
                setFilters({ ...filters, minCookTime: e.target.value });
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '1rem'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
              Thời gian tối đa (phút)
            </label>
            <input
              type="number"
              placeholder="999"
              value={filters.maxCookTime}
              onChange={(e) => {
                setFilters({ ...filters, maxCookTime: e.target.value });
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '1rem'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: '#6b7280' }}>
              Tag
            </label>
            <select
              value={filters.tag}
              onChange={(e) => {
                setFilters({ ...filters, tag: e.target.value });
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '6px',
                fontSize: '1rem',
                background: 'white',
                cursor: 'pointer'
              }}
            >
              <option value="">Tất cả tags</option>
              {availableTags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>
          <div>
            <button
              onClick={clearFilters}
              style={{
                padding: '0.75rem 1rem',
                background: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              Xóa bộ lọc
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div style={{ 
          padding: '1rem', 
          background: '#fee', 
          color: '#c33', 
          borderRadius: '8px',
          marginBottom: '1rem'
        }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>Đang tải...</div>
      ) : (
        <>
          <div style={{ 
            background: 'white', 
            borderRadius: '8px', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)', 
            overflow: 'hidden'
          }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Hình ảnh</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Tiêu đề</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Vùng</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Thời gian</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Lượt thích</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Kcal</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Tags</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600', color: '#374151' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {recipes.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: '#6b7280' }}>
                      Không có công thức nào
                    </td>
                  </tr>
                ) : (
                  recipes.map((recipe) => (
                    <tr
                      key={recipe.id}
                      onClick={() => handleViewDetail(recipe)}
                      style={{
                        borderBottom: '1px solid #f3f4f6',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f9fafb';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <td style={{ padding: '1rem' }}>
                        {recipe.image ? (
                          <img
                            src={recipe.image}
                            alt={recipe.title}
                            style={{
                              width: '60px',
                              height: '60px',
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
                            width: '60px',
                            height: '60px',
                            background: '#f3f4f6',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#9ca3af',
                            fontSize: '0.75rem'
                          }}>
                            No Image
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem', fontWeight: '500' }}>{recipe.title}</td>
                      <td style={{ padding: '1rem' }}>
                        {recipe.region === 'Northern' ? 'Miền Bắc' :
                         recipe.region === 'Central' ? 'Miền Trung' :
                         recipe.region === 'Southern' ? 'Miền Nam' : '-'}
                      </td>
                      <td style={{ padding: '1rem' }}>{recipe.cookTime ? `${recipe.cookTime} phút` : '-'}</td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ color: '#ef4444' }}>❤️</span> {recipe.likes || 0}
                      </td>
                      <td style={{ padding: '1rem', fontWeight: '500' }}>
                        {recipe.totalKcal ? `${Math.round(recipe.totalKcal)} kcal` : '-'}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                          {recipe.tags.slice(0, 3).map((tag, idx) => (
                            <span
                              key={idx}
                              style={{
                                padding: '0.25rem 0.5rem',
                                background: '#e0e7ff',
                                color: '#4338ca',
                                borderRadius: '4px',
                                fontSize: '0.75rem'
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                          {recipe.tags.length > 3 && (
                            <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>+{recipe.tags.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '1rem' }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={(e) => handleEdit(e, recipe)}
                            style={{
                              padding: '0.5rem 1rem',
                              background: '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.875rem',
                              fontWeight: '500'
                            }}
                          >
                            Sửa
                          </button>
                          <button
                            onClick={(e) => handleDelete(e, recipe.id)}
                            style={{
                              padding: '0.5rem 1rem',
                              background: '#ef4444',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '0.875rem',
                              fontWeight: '500'
                            }}
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div style={{ 
            marginTop: '1.5rem', 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            background: 'white',
            padding: '1rem 1.5rem',
            borderRadius: '8px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
          }}>
            <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
              Hiển thị {(page - 1) * limit + 1} - {Math.min(page * limit, total)} / {total} công thức
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{
                  padding: '0.5rem 1rem',
                  background: page === 1 ? '#f3f4f6' : '#3b82f6',
                  color: page === 1 ? '#9ca3af' : 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: page === 1 ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                ← Trước
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={page * limit >= total}
                style={{
                  padding: '0.5rem 1rem',
                  background: page * limit >= total ? '#f3f4f6' : '#3b82f6',
                  color: page * limit >= total ? '#9ca3af' : 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: page * limit >= total ? 'not-allowed' : 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}
              >
                Sau →
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

      {showDetailModal && selectedRecipe && (
        <RecipeDetailModal
          recipe={selectedRecipe}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedRecipe(null);
          }}
          onEdit={(recipe) => {
            setShowDetailModal(false);
            setSelectedRecipe(null);
            setEditingRecipe(recipe);
            setShowModal(true);
          }}
        />
      )}
    </div>
  );
}

function RecipeDetailModal({ recipe, onClose, onEdit }: { recipe: any; onClose: () => void; onEdit: (recipe: any) => void }) {
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
        maxWidth: '800px',
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

        {recipe.image && (
          <img
            src={recipe.image}
            alt={recipe.title}
            style={{
              width: '100%',
              height: '300px',
              objectFit: 'cover',
              borderTopLeftRadius: '12px',
              borderTopRightRadius: '12px'
            }}
          />
        )}

        <div style={{ padding: '2rem' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '1rem', color: '#1f2937' }}>
            {recipe.title}
          </h2>

          {recipe.description && (
            <p style={{ color: '#6b7280', marginBottom: '1.5rem', lineHeight: '1.6' }}>
              {recipe.description}
            </p>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Vùng miền</div>
              <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937' }}>
                {recipe.region === 'Northern' ? 'Miền Bắc' :
                 recipe.region === 'Central' ? 'Miền Trung' :
                 recipe.region === 'Southern' ? 'Miền Nam' : '-'}
              </div>
            </div>
            <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Thời gian nấu</div>
              <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937' }}>
                {recipe.cookTime ? `${recipe.cookTime} phút` : '-'}
              </div>
            </div>
            <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Lượt thích</div>
              <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937' }}>
                ❤️ {recipe.likes || 0}
              </div>
            </div>
            <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Kcal</div>
              <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937' }}>
                {recipe.totalKcal ? Math.round(recipe.totalKcal) : '-'}
              </div>
            </div>
          </div>

          {recipe.tags && recipe.tags.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem', color: '#1f2937' }}>Tags</h3>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {recipe.tags.map((tag: string, idx: number) => (
                  <span
                    key={idx}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#e0e7ff',
                      color: '#4338ca',
                      borderRadius: '6px',
                      fontSize: '0.875rem',
                      fontWeight: '500'
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {recipe.items && recipe.items.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem', color: '#1f2937' }}>Nguyên liệu</h3>
              <div style={{ background: '#f9fafb', borderRadius: '8px', padding: '1rem' }}>
                {recipe.items.map((item: any, idx: number) => {
                  const ingredient = item.ingredient;
                  const amount = item.amount || 0;
                  return (
                    <div key={idx} style={{ padding: '0.75rem 0', borderBottom: idx < recipe.items.length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '500' }}>{ingredient?.name || 'Unknown'}</span>
                        <span style={{ color: '#6b7280' }}>
                          {amount} {item.unitOverride || ingredient?.unit || 'g'}
                        </span>
                      </div>
                      {ingredient && amount > 0 && (
                        <div style={{ 
                          fontSize: '0.75rem', 
                          color: '#6b7280', 
                          marginTop: '0.5rem',
                          paddingLeft: '0.5rem',
                          fontStyle: 'italic'
                        }}>
                          Dinh dưỡng: Kcal: {Math.round((ingredient.kcal || 0) * (amount / 100))} | 
                          P: {Math.round((ingredient.protein || 0) * (amount / 100))}g | 
                          F: {Math.round((ingredient.fat || 0) * (amount / 100))}g | 
                          C: {Math.round((ingredient.carbs || 0) * (amount / 100))}g
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {recipe.steps && Array.isArray(recipe.steps) && recipe.steps.length > 0 && (
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.125rem', marginBottom: '1rem', color: '#1f2937' }}>Các bước nấu</h3>
              <ol style={{ paddingLeft: '1.5rem', lineHeight: '1.8' }}>
                {recipe.steps.map((step: string, idx: number) => (
                  <li key={idx} style={{ marginBottom: '0.75rem', color: '#374151' }}>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {recipe.totalKcal && (
            <div style={{ 
              padding: '1.5rem', 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '8px',
              color: 'white',
              marginBottom: '1.5rem'
            }}>
              <div style={{ fontSize: '0.875rem', marginBottom: '0.5rem', opacity: 0.9 }}>Dinh dưỡng</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{Math.round(recipe.totalKcal)}</div>
                  <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Kcal</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{recipe.protein ? Math.round(recipe.protein) : '-'}</div>
                  <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Protein (g)</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{recipe.fat ? Math.round(recipe.fat) : '-'}</div>
                  <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Fat (g)</div>
                </div>
                <div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{recipe.carbs ? Math.round(recipe.carbs) : '-'}</div>
                  <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>Carbs (g)</div>
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button
              onClick={onClose}
              style={{
                padding: '0.75rem 1.5rem',
                background: '#f3f4f6',
                color: '#374151',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: '500'
              }}
            >
              Đóng
            </button>
            <button
              onClick={() => onEdit(recipe)}
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
              Sửa công thức
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
