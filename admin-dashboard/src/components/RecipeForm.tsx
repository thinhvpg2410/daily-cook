import { useState, useEffect } from 'react';
import { adminApi } from '../api/admin';
import type { Recipe, Ingredient } from '../api/admin';

interface RecipeFormProps {
  recipe?: Recipe | null;
  onClose: () => void;
  onSave: () => void;
}

const MEAL_TIME_TAGS = ['Sáng', 'Trưa', 'Chiều', 'Tối'];
const REGION_TAGS = ['Miền Bắc', 'Miền Trung', 'Miền Nam'];
const DIET_TAGS = ['Chay', 'Mặn', 'Thuần chay'];

export default function RecipeForm({ recipe, onClose, onSave }: RecipeFormProps) {
  const [formData, setFormData] = useState({
    title: recipe?.title || '',
    description: recipe?.description || '',
    cookTime: recipe?.cookTime || 30,
    region: recipe?.region || '',
    image: recipe?.image || '',
    steps: (recipe as any)?.steps ? (Array.isArray((recipe as any).steps) ? (recipe as any).steps : []) : [''],
    tags: recipe?.tags || [],
    items: [] as Array<{ ingredientId: string; amount: number; unitOverride?: string }>,
  });

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [nutrition, setNutrition] = useState({ kcal: 0, protein: 0, fat: 0, carbs: 0 });

  useEffect(() => {
    fetchIngredients();
    fetchTags();
  }, []);

  const fetchTags = async () => {
    try {
      const tags = await adminApi.getAllTags();
      setAvailableTags(tags);
    } catch (err) {
      console.error('Failed to fetch tags:', err);
      // Fallback to default tags if fetch fails
      setAvailableTags([...MEAL_TIME_TAGS, ...REGION_TAGS, ...DIET_TAGS]);
    }
  };

  useEffect(() => {
    if (recipe) {
      loadRecipeData();
    }
  }, [recipe]);

  const fetchIngredients = async () => {
    try {
      const response = await adminApi.getIngredients({ limit: 1000 });
      setIngredients(response.data);
    } catch (err) {
      console.error('Failed to fetch ingredients:', err);
    }
  };

  const loadRecipeData = async () => {
    if (!recipe) return;
    try {
      const fullRecipe: any = await adminApi.getRecipe(recipe.id);
      const recipeItems = fullRecipe.items?.map((item: any) => ({
        ingredientId: item.ingredientId,
        amount: item.amount,
        unitOverride: item.unitOverride,
      })) || [];

      setFormData(prev => ({
        ...prev,
        title: fullRecipe.title || '',
        description: fullRecipe.description || '',
        cookTime: fullRecipe.cookTime || 30,
        region: fullRecipe.region || '',
        image: fullRecipe.image || '',
        steps: fullRecipe.steps ? (Array.isArray(fullRecipe.steps) ? fullRecipe.steps : []) : [''],
        tags: fullRecipe.tags || [],
        items: recipeItems,
      }));

      if (fullRecipe.totalKcal) {
        setNutrition({
          kcal: fullRecipe.totalKcal,
          protein: fullRecipe.protein || 0,
          fat: fullRecipe.fat || 0,
          carbs: fullRecipe.carbs || 0,
        });
      }
    } catch (err) {
      console.error('Failed to load recipe:', err);
    }
  };

  const handleTagToggle = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  const handleAddIngredient = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { ingredientId: '', amount: 0 }],
    }));
  };

  const handleRemoveIngredient = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_: any, i: number) => i !== index),
    }));
    calculateNutrition();
  };

  const handleIngredientChange = (index: number, field: string, value: any) => {
    setFormData(prev => {
      const newItems = [...prev.items];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, items: newItems };
    });
    calculateNutrition();
  };

  const calculateNutrition = () => {
    let totalKcal = 0;
    let totalProtein = 0;
    let totalFat = 0;
    let totalCarbs = 0;

    formData.items.forEach(item => {
      const ingredient = ingredients.find(ing => ing.id === item.ingredientId);
      if (ingredient) {
        const ratio = item.amount / 100; // per 100g/ml
        if (ingredient.kcal) totalKcal += ingredient.kcal * ratio;
        if (ingredient.protein) totalProtein += ingredient.protein * ratio;
        if (ingredient.fat) totalFat += ingredient.fat * ratio;
        if (ingredient.carbs) totalCarbs += ingredient.carbs * ratio;
      }
    });

    setNutrition({
      kcal: Math.round(totalKcal * 100) / 100,
      protein: Math.round(totalProtein * 100) / 100,
      fat: Math.round(totalFat * 100) / 100,
      carbs: Math.round(totalCarbs * 100) / 100,
    });
  };

  useEffect(() => {
    calculateNutrition();
  }, [formData.items, ingredients]);

  const handleAddStep = () => {
    setFormData(prev => ({
      ...prev,
      steps: [...prev.steps, ''],
    }));
  };

  const handleStepChange = (index: number, value: string) => {
    setFormData(prev => {
      const newSteps = [...prev.steps];
      newSteps[index] = value;
      return { ...prev, steps: newSteps };
    });
  };

  const handleRemoveStep = (index: number) => {
    setFormData(prev => ({
      ...prev,
      steps: prev.steps.filter((_: string, i: number) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = {
        ...formData,
        steps: formData.steps.filter((s: string) => s.trim()),
        items: formData.items.filter((item: any) => item.ingredientId && item.amount > 0),
      };

      if (recipe) {
        await adminApi.updateRecipe(recipe.id, data);
      } else {
        await adminApi.createRecipe(data);
      }
      onSave();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể lưu công thức');
    } finally {
      setLoading(false);
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
      zIndex: 1000,
      overflow: 'auto',
      padding: '2rem'
    }}>
      <div style={{
        background: 'white',
        padding: '2rem',
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
            zIndex: 10,
            fontWeight: 'bold'
          }}
          title="Đóng"
        >
          ×
        </button>
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', color: '#1f2937' }}>
          {recipe ? 'Sửa công thức' : 'Thêm công thức mới'}
        </h2>

        <form onSubmit={handleSubmit}>
          {/* Basic Info */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Thông tin cơ bản</h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Tên món ăn *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Mô tả</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>Thời gian nấu (phút)</label>
                  <input
                    type="number"
                    value={formData.cookTime}
                    onChange={(e) => setFormData({ ...formData, cookTime: parseInt(e.target.value) || 0 })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>Vùng miền</label>
                  <select
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  >
                    <option value="">Chọn vùng</option>
                    <option value="Northern">Miền Bắc</option>
                    <option value="Central">Miền Trung</option>
                    <option value="Southern">Miền Nam</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem' }}>URL ảnh</label>
                <input
                  type="text"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Tags</h3>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Chọn tags (có thể chọn nhiều):
              </label>
              <div style={{
                border: '1px solid #ddd',
                borderRadius: '6px',
                padding: '0.5rem',
                minHeight: '150px',
                maxHeight: '300px',
                overflowY: 'auto',
                background: '#fafafa'
              }}>
                {availableTags.length === 0 ? (
                  <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                    Đang tải tags...
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {availableTags.map(tag => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => handleTagToggle(tag)}
                        style={{
                          padding: '0.5rem 1rem',
                          border: `2px solid ${formData.tags.includes(tag) ? '#3b82f6' : '#e5e7eb'}`,
                          background: formData.tags.includes(tag) ? '#3b82f6' : 'white',
                          color: formData.tags.includes(tag) ? 'white' : '#374151',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: formData.tags.includes(tag) ? '600' : '400',
                          transition: 'all 0.2s',
                          boxShadow: formData.tags.includes(tag) ? '0 2px 4px rgba(59, 130, 246, 0.3)' : 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (!formData.tags.includes(tag)) {
                            e.currentTarget.style.borderColor = '#3b82f6';
                            e.currentTarget.style.background = '#eff6ff';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!formData.tags.includes(tag)) {
                            e.currentTarget.style.borderColor = '#e5e7eb';
                            e.currentTarget.style.background = 'white';
                          }
                        }}
                      >
                        {tag}
                        {formData.tags.includes(tag) && ' ✓'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {formData.tags.length > 0 && (
                <div style={{ marginTop: '0.75rem' }}>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>
                    Đã chọn ({formData.tags.length}):
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {formData.tags.map(tag => (
                      <span
                        key={tag}
                        style={{
                          padding: '0.375rem 0.75rem',
                          background: '#3b82f6',
                          color: 'white',
                          borderRadius: '6px',
                          fontSize: '0.875rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleTagToggle(tag)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            padding: 0,
                            width: '1.25rem',
                            height: '1.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '50%'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.2)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Ingredients */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem' }}>Nguyên liệu</h3>
              <button
                type="button"
                onClick={handleAddIngredient}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                + Thêm nguyên liệu
              </button>
            </div>
            {formData.items.map((item: any, index: number) => {
              const ingredient = ingredients.find(ing => ing.id === item.ingredientId);
              const amount = item.amount || 0;
              
              // Calculate nutrition for this ingredient based on amount
              const calculateIngredientNutrition = () => {
                if (!ingredient || amount <= 0) {
                  return { kcal: 0, protein: 0, fat: 0, carbs: 0 };
                }
                const ratio = amount / 100; // per 100g/ml
                return {
                  kcal: (ingredient.kcal || 0) * ratio,
                  protein: (ingredient.protein || 0) * ratio,
                  fat: (ingredient.fat || 0) * ratio,
                  carbs: (ingredient.carbs || 0) * ratio,
                };
              };
              
              const itemNutrition = calculateIngredientNutrition();
              
              return (
                <div key={index} style={{ marginBottom: '1rem', padding: '1rem', background: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'end' }}>
                    <div>
                      <select
                        value={item.ingredientId}
                        onChange={(e) => handleIngredientChange(index, 'ingredientId', e.target.value)}
                        required
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                      >
                        <option value="">Chọn nguyên liệu</option>
                        {ingredients.map(ing => (
                          <option key={ing.id} value={ing.id}>{ing.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <input
                        type="number"
                        placeholder="Số lượng"
                        value={item.amount || ''}
                        onChange={(e) => handleIngredientChange(index, 'amount', parseFloat(e.target.value) || 0)}
                        required
                        min="0"
                        step="0.1"
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder={ingredient?.unit || 'Đơn vị'}
                        value={item.unitOverride || ''}
                        onChange={(e) => handleIngredientChange(index, 'unitOverride', e.target.value)}
                        style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveIngredient(index)}
                      style={{
                        padding: '0.5rem',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Xóa
                    </button>
                  </div>
                  
                  {/* Nutrition info for this ingredient */}
                  {ingredient && amount > 0 && (
                    <div style={{
                      padding: '0.75rem',
                      background: 'white',
                      borderRadius: '6px',
                      border: '1px solid #e5e7eb',
                      fontSize: '0.875rem',
                      color: '#6b7280'
                    }}>
                      <div style={{ fontWeight: '500', marginBottom: '0.5rem', color: '#374151' }}>
                        Dinh dưỡng cho {amount} {item.unitOverride || ingredient.unit || 'g'}:
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
                        <div>
                          <span style={{ color: '#9ca3af' }}>Kcal: </span>
                          <span style={{ fontWeight: '600', color: '#1f2937' }}>
                            {Math.round(itemNutrition.kcal)}
                          </span>
                        </div>
                        <div>
                          <span style={{ color: '#9ca3af' }}>Protein: </span>
                          <span style={{ fontWeight: '600', color: '#1f2937' }}>
                            {itemNutrition.protein.toFixed(1)}g
                          </span>
                        </div>
                        <div>
                          <span style={{ color: '#9ca3af' }}>Fat: </span>
                          <span style={{ fontWeight: '600', color: '#1f2937' }}>
                            {itemNutrition.fat.toFixed(1)}g
                          </span>
                        </div>
                        <div>
                          <span style={{ color: '#9ca3af' }}>Carbs: </span>
                          <span style={{ fontWeight: '600', color: '#1f2937' }}>
                            {itemNutrition.carbs.toFixed(1)}g
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Nutrition */}
          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f9fafb', borderRadius: '4px' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem' }}>Dinh dưỡng (tự động tính)</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Kcal</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{Math.round(nutrition.kcal)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Protein (g)</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{nutrition.protein.toFixed(1)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Fat (g)</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{nutrition.fat.toFixed(1)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Carbs (g)</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{nutrition.carbs.toFixed(1)}</div>
              </div>
            </div>
          </div>

          {/* Steps */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.1rem' }}>Các bước nấu</h3>
              <button
                type="button"
                onClick={handleAddStep}
                style={{
                  padding: '0.5rem 1rem',
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                + Thêm bước
              </button>
            </div>
            {formData.steps.map((step: string, index: number) => (
              <div key={index} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input
                  type="text"
                  value={step}
                  onChange={(e) => handleStepChange(index, e.target.value)}
                  placeholder={`Bước ${index + 1}`}
                  style={{ flex: 1, padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                />
                <button
                  type="button"
                  onClick={() => handleRemoveStep(index)}
                  style={{
                    padding: '0.5rem',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  Xóa
                </button>
              </div>
            ))}
          </div>

          {/* Actions */}
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
              disabled={loading}
              style={{
                padding: '0.5rem 1rem',
                background: loading ? '#ccc' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Đang lưu...' : 'Lưu'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

