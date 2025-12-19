import { useEffect, useState } from 'react';
import { adminApi } from '../api/admin';
import type { User } from '../api/admin';

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const limit = 20;

  useEffect(() => {
    fetchUsers();
  }, [page, search]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await adminApi.getUsers({ page, limit, search: search || undefined });
      setUsers(response.data);
      setTotal(response.total);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetail = async (userId: string) => {
    try {
      const user = await adminApi.getUser(userId);
      setSelectedUser(user);
      setShowDetailModal(true);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể tải thông tin người dùng');
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'USER' | 'ADMIN', e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await adminApi.updateUserRole(userId, newRole);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể cập nhật vai trò');
    }
  };

  const handleDelete = async (userId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Bạn có chắc chắn muốn xóa người dùng này?')) return;
    try {
      await adminApi.deleteUser(userId);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể xóa người dùng');
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setShowEditModal(true);
  };

  const handleSaveUser = async (formData: any) => {
    if (!editingUser) return;
    try {
      await adminApi.updateUser(editingUser.id, formData);
      setShowEditModal(false);
      setEditingUser(null);
      fetchUsers();
      if (selectedUser?.id === editingUser.id) {
        const updated = await adminApi.getUser(editingUser.id);
        setSelectedUser(updated);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Không thể cập nhật người dùng');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', color: '#1f2937' }}>Quản lý Người dùng</h1>
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
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Avatar</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Email</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Tên</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Số điện thoại</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Vai trò</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>2FA</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Ngày tạo</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr 
                    key={user.id} 
                    style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
                    onClick={() => fetchUserDetail(user.id)}
                  >
                    <td style={{ padding: '0.75rem' }}>
                      {user.avatarUrl ? (
                        <img 
                          src={user.avatarUrl} 
                          alt={user.name || user.email}
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            objectFit: 'cover'
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: '#e5e7eb',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#6b7280',
                          fontSize: '1.2rem',
                          fontWeight: 'bold'
                        }}>
                          {(user.name || user.email)[0].toUpperCase()}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '0.75rem' }}>{user.email}</td>
                    <td style={{ padding: '0.75rem' }}>{user.name || '-'}</td>
                    <td style={{ padding: '0.75rem' }}>{user.phone}</td>
                    <td style={{ padding: '0.75rem' }}>
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value as 'USER' | 'ADMIN', e as any)}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          padding: '0.25rem 0.5rem',
                          border: '1px solid #ddd',
                          borderRadius: '4px',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="USER">USER</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {user.isTwoFAEnabled ? '✓' : '-'}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td style={{ padding: '0.75rem' }}>
                      <button
                        onClick={(e) => handleDelete(user.id, e)}
                        style={{
                          padding: '0.25rem 0.75rem',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          marginRight: '0.5rem'
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

      {showDetailModal && selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedUser(null);
          }}
          onEdit={() => {
            setShowDetailModal(false);
            handleEdit(selectedUser);
          }}
        />
      )}

      {showEditModal && editingUser && (
        <UserEditForm
          user={editingUser}
          onClose={() => {
            setShowEditModal(false);
            setEditingUser(null);
          }}
          onSave={handleSaveUser}
        />
      )}
    </div>
  );
}

function UserDetailModal({ user, onClose, onEdit }: { user: User; onClose: () => void; onEdit: () => void }) {
  const pref = user.preference;

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

        <div style={{ padding: '2rem' }}>
          {/* Avatar and Basic Info */}
          <div style={{ display: 'flex', gap: '2rem', marginBottom: '2rem', alignItems: 'center' }}>
            {user.avatarUrl ? (
              <img 
                src={user.avatarUrl} 
                alt={user.name || user.email}
                style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '4px solid #e5e7eb'
                }}
              />
            ) : (
              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: '#e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#6b7280',
                fontSize: '3rem',
                fontWeight: 'bold',
                border: '4px solid #e5e7eb'
              }}>
                {(user.name || user.email)[0].toUpperCase()}
              </div>
            )}
            <div style={{ flex: 1 }}>
              <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem', color: '#1f2937' }}>
                {user.name || user.email}
              </h2>
              <p style={{ color: '#6b7280', marginBottom: '0.5rem' }}>{user.email}</p>
              <p style={{ color: '#6b7280', marginBottom: '0.5rem' }}>SĐT: {user.phone}</p>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <span style={{
                  padding: '0.25rem 0.75rem',
                  background: user.role === 'ADMIN' ? '#fef3c7' : '#dbeafe',
                  color: user.role === 'ADMIN' ? '#92400e' : '#1e40af',
                  borderRadius: '4px',
                  fontSize: '0.875rem',
                  fontWeight: '500'
                }}>
                  {user.role}
                </span>
                {user.isTwoFAEnabled && (
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    background: '#d1fae5',
                    color: '#065f46',
                    borderRadius: '4px',
                    fontSize: '0.875rem',
                    fontWeight: '500'
                  }}>
                    2FA ✓
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* User Info Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Ngày sinh</div>
              <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937' }}>
                {user.dob ? new Date(user.dob).toLocaleDateString('vi-VN') : '-'}
              </div>
            </div>
            <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Ngày tạo</div>
              <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937' }}>
                {new Date(user.createdAt).toLocaleDateString('vi-VN')}
              </div>
            </div>
          </div>

          {/* Nutrition Goals */}
          {pref && (
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem', color: '#1f2937' }}>Mục tiêu dinh dưỡng</h3>
              <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '8px', padding: '1.5rem', color: 'white', marginBottom: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>Mục tiêu Kcal/ngày</div>
                    <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                      {pref.dailyKcalTarget ? Math.round(pref.dailyKcalTarget) : '-'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>Mục tiêu</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>
                      {pref.goal === 'lose_weight' ? 'Giảm cân' :
                       pref.goal === 'maintain' ? 'Duy trì' :
                       pref.goal === 'gain_muscle' ? 'Tăng cơ' : '-'}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Tuổi</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937' }}>
                    {pref.age || '-'}
                  </div>
                </div>
                <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Chiều cao</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937' }}>
                    {pref.height ? `${pref.height} cm` : '-'}
                  </div>
                </div>
                <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Cân nặng</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937' }}>
                    {pref.weight ? `${pref.weight} kg` : '-'}
                  </div>
                </div>
                <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Giới tính</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937' }}>
                    {pref.gender === 'male' ? 'Nam' : pref.gender === 'female' ? 'Nữ' : '-'}
                  </div>
                </div>
                <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Hoạt động</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937' }}>
                    {pref.activity === 'low' ? 'Thấp' :
                     pref.activity === 'medium' ? 'Trung bình' :
                     pref.activity === 'high' ? 'Cao' : '-'}
                  </div>
                </div>
                <div style={{ padding: '1rem', background: '#f9fafb', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Chế độ ăn</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: '600', color: '#1f2937' }}>
                    {pref.dietType === 'vegan' ? 'Thuần chay' :
                     pref.dietType === 'low_carb' ? 'Ít carb' :
                     pref.dietType === 'normal' ? 'Bình thường' : '-'}
                  </div>
                </div>
              </div>

              {pref.likedTags && pref.likedTags.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Tags yêu thích</div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {pref.likedTags.map((tag, idx) => (
                      <span
                        key={idx}
                        style={{
                          padding: '0.25rem 0.75rem',
                          background: '#e0e7ff',
                          color: '#4338ca',
                          borderRadius: '4px',
                          fontSize: '0.875rem'
                        }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {pref.dislikedIngredients && pref.dislikedIngredients.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.5rem' }}>Nguyên liệu không thích</div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {pref.dislikedIngredients.map((ing, idx) => (
                      <span
                        key={idx}
                        style={{
                          padding: '0.25rem 0.75rem',
                          background: '#fee2e2',
                          color: '#991b1b',
                          borderRadius: '4px',
                          fontSize: '0.875rem'
                        }}
                      >
                        {ing}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {!pref && (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280', background: '#f9fafb', borderRadius: '8px', marginBottom: '2rem' }}>
              Người dùng chưa thiết lập mục tiêu dinh dưỡng
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
              onClick={onEdit}
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
              Chỉnh sửa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function UserEditForm({ user, onClose, onSave }: { user: User; onClose: () => void; onSave: (data: any) => void }) {
  const [formData, setFormData] = useState({
    name: user.name || '',
    email: user.email,
    phone: user.phone,
    dob: user.dob ? new Date(user.dob).toISOString().split('T')[0] : '',
    avatarUrl: user.avatarUrl || '',
    role: user.role as 'USER' | 'ADMIN',
    preference: {
      gender: user.preference?.gender || '',
      age: user.preference?.age || '',
      height: user.preference?.height || '',
      weight: user.preference?.weight || '',
      activity: user.preference?.activity || '',
      goal: user.preference?.goal || '',
      dailyKcalTarget: user.preference?.dailyKcalTarget || '',
      dietType: user.preference?.dietType || '',
      dislikedIngredients: user.preference?.dislikedIngredients?.join(', ') || '',
      likedTags: user.preference?.likedTags?.join(', ') || '',
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitData: any = {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      dob: formData.dob || undefined,
      avatarUrl: formData.avatarUrl || undefined,
      role: formData.role,
      preference: {
        gender: formData.preference.gender || undefined,
        age: formData.preference.age ? parseInt(formData.preference.age as any) : undefined,
        height: formData.preference.height ? parseInt(formData.preference.height as any) : undefined,
        weight: formData.preference.weight ? parseFloat(formData.preference.weight as any) : undefined,
        activity: formData.preference.activity || undefined,
        goal: formData.preference.goal || undefined,
        dailyKcalTarget: formData.preference.dailyKcalTarget ? parseFloat(formData.preference.dailyKcalTarget as any) : undefined,
        dietType: formData.preference.dietType || undefined,
        dislikedIngredients: formData.preference.dislikedIngredients ? formData.preference.dislikedIngredients.split(',').map(s => s.trim()).filter(s => s) : undefined,
        likedTags: formData.preference.likedTags ? formData.preference.likedTags.split(',').map(s => s.trim()).filter(s => s) : undefined,
      }
    };
    onSave(submitData);
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
      padding: '2rem',
      overflow: 'auto'
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
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem', color: '#1f2937' }}>
            Chỉnh sửa người dùng
          </h2>

          <form onSubmit={handleSubmit}>
            {/* Basic Info */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', color: '#374151' }}>Thông tin cơ bản</h3>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>Tên</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Số điện thoại</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      required
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Ngày sinh</label>
                    <input
                      type="date"
                      value={formData.dob}
                      onChange={(e) => setFormData({ ...formData, dob: e.target.value })}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Avatar URL</label>
                    <input
                      type="url"
                      value={formData.avatarUrl}
                      onChange={(e) => setFormData({ ...formData, avatarUrl: e.target.value })}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Vai trò</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as 'USER' | 'ADMIN' })}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                    >
                      <option value="USER">USER</option>
                      <option value="ADMIN">ADMIN</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Preference */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ marginBottom: '1rem', fontSize: '1.1rem', color: '#374151' }}>Mục tiêu dinh dưỡng</h3>
              <div style={{ display: 'grid', gap: '1rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Tuổi</label>
                    <input
                      type="number"
                      value={formData.preference.age}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        preference: { ...formData.preference, age: e.target.value } 
                      })}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Chiều cao (cm)</label>
                    <input
                      type="number"
                      value={formData.preference.height}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        preference: { ...formData.preference, height: e.target.value } 
                      })}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Cân nặng (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.preference.weight}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        preference: { ...formData.preference, weight: e.target.value } 
                      })}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Giới tính</label>
                    <select
                      value={formData.preference.gender}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        preference: { ...formData.preference, gender: e.target.value } 
                      })}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                    >
                      <option value="">Chọn giới tính</option>
                      <option value="male">Nam</option>
                      <option value="female">Nữ</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Mức độ hoạt động</label>
                    <select
                      value={formData.preference.activity}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        preference: { ...formData.preference, activity: e.target.value } 
                      })}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                    >
                      <option value="">Chọn mức độ</option>
                      <option value="low">Thấp</option>
                      <option value="medium">Trung bình</option>
                      <option value="high">Cao</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Mục tiêu</label>
                    <select
                      value={formData.preference.goal}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        preference: { ...formData.preference, goal: e.target.value } 
                      })}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                    >
                      <option value="">Chọn mục tiêu</option>
                      <option value="lose_weight">Giảm cân</option>
                      <option value="maintain">Duy trì</option>
                      <option value="gain_muscle">Tăng cơ</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Chế độ ăn</label>
                    <select
                      value={formData.preference.dietType}
                      onChange={(e) => setFormData({ 
                        ...formData, 
                        preference: { ...formData.preference, dietType: e.target.value } 
                      })}
                      style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                    >
                      <option value="">Chọn chế độ</option>
                      <option value="normal">Bình thường</option>
                      <option value="vegan">Thuần chay</option>
                      <option value="low_carb">Ít carb</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>Mục tiêu Kcal/ngày</label>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.preference.dailyKcalTarget}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      preference: { ...formData.preference, dailyKcalTarget: e.target.value } 
                    })}
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>Tags yêu thích (phân cách bằng dấu phẩy)</label>
                  <input
                    type="text"
                    value={formData.preference.likedTags}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      preference: { ...formData.preference, likedTags: e.target.value } 
                    })}
                    placeholder="Ví dụ: Sáng, Miền Bắc, Chay"
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem' }}>Nguyên liệu không thích (phân cách bằng dấu phẩy)</label>
                  <input
                    type="text"
                    value={formData.preference.dislikedIngredients}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      preference: { ...formData.preference, dislikedIngredients: e.target.value } 
                    })}
                    placeholder="Ví dụ: Hành, Tỏi, Ớt"
                    style={{ width: '100%', padding: '0.5rem', border: '1px solid #ddd', borderRadius: '4px' }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
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
                Hủy
              </button>
              <button
                type="submit"
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
                Lưu
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
