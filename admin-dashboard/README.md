# Admin Dashboard - DailyCook

Admin dashboard web để quản lý ứng dụng DailyCook.

## Tính năng

- **Dashboard**: Thống kê tổng quan về người dùng, công thức, kế hoạch bữa ăn, nhật ký ăn uống
- **Quản lý Người dùng**: Xem, tìm kiếm, cập nhật vai trò, xóa người dùng
- **Quản lý Công thức**: Xem, tìm kiếm, xóa công thức
- **Kế hoạch Bữa ăn**: Xem danh sách kế hoạch bữa ăn của người dùng
- **Nhật ký Ăn uống**: Xem nhật ký ăn uống của người dùng
- **Quản lý Nguyên liệu**: Xem, tìm kiếm, thêm, sửa, xóa nguyên liệu

## Yêu cầu

- Node.js 20.19+ hoặc 22.12+
- npm hoặc yarn

## Cài đặt

```bash
npm install
```

## Cấu hình

Tạo file `.env` trong thư mục `admin-dashboard`:

```env
VITE_API_URL=http://localhost:3000
```

## Chạy ứng dụng

```bash
npm run dev
```

Ứng dụng sẽ chạy tại `http://localhost:5173`

## Build cho production

```bash
npm run build
```

Files sẽ được build vào thư mục `dist/`

## Đăng nhập

Chỉ tài khoản có vai trò `ADMIN` mới có thể đăng nhập vào admin dashboard.

## Công nghệ sử dụng

- React 19
- TypeScript
- Vite
- React Router
- Axios
- TanStack Query (React Query)
