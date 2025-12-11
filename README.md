# 🍳 DailyCook - Ứng dụng Quản lý Thực đơn & Dinh dưỡng

DailyCook là một ứng dụng mobile toàn diện giúp người dùng quản lý thực đơn hàng ngày, theo dõi dinh dưỡng, và nhận gợi ý món ăn thông minh từ AI.

![DailyCook](https://img.shields.io/badge/DailyCook-v1.0-blue)
![React Native](https://img.shields.io/badge/React%20Native-0.79.6-61DAFB)
![NestJS](https://img.shields.io/badge/NestJS-11.1.6-E0234E)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7.3-3178C6)

## 📱 Tính năng chính

### 🎯 Quản lý Thực đơn
- **Lịch ăn hàng ngày**: Lập kế hoạch bữa ăn cho cả tuần
- **Gợi ý thông minh**: AI gợi ý món ăn dựa trên sở thích và mục tiêu
- **Phân loại bữa ăn**: Sáng, Trưa, Tối với nhiều món
- **Copy tuần**: Sao chép thực đơn từ tuần này sang tuần khác

### 🤖 AI-Powered Suggestions
- **Chat với AI**: Tương tác tự nhiên để tìm món ăn phù hợp
- **Gợi ý theo ngữ cảnh**: Dựa trên preferences, lịch sử, và mục tiêu dinh dưỡng
- **Gemini 2.0 Flash**: Sử dụng Google Gemini AI cho gợi ý chính xác

### 📊 Theo dõi Dinh dưỡng
- **Nutrition Goals**: Thiết lập mục tiêu calo và macros (protein, fat, carbs)
- **Food Logging**: Ghi lại các bữa ăn đã ăn
- **Thống kê hàng ngày**: Xem tiến độ so với mục tiêu
- **BMR/TDEE Calculator**: Tự động tính toán nhu cầu năng lượng

### 🛒 Danh sách Mua sắm
- **Tự động tạo**: Từ meal plans đã lập
- **Quản lý nguyên liệu**: Check/uncheck items
- **Theo tuần**: Shopping list cho cả tuần

### 👤 Quản lý Người dùng
- **Authentication**: Email/Phone, Google Sign-in, 2FA
- **User Preferences**: Lưu sở thích, dị ứng, mục tiêu
- **Favorite Recipes**: Lưu các món ăn yêu thích
- **Profile Management**: Cập nhật thông tin cá nhân

### 🍽️ Recipe Management
- **Browse Recipes**: Xem tất cả món ăn
- **Recipe Details**: Chi tiết món ăn, nguyên liệu, cách làm
- **Search & Filter**: Tìm kiếm theo tên, tag, vùng miền
- **Categories**: Phân loại theo loại món (Breakfast, Lunch, Dinner, etc.)

## 🛠️ Tech Stack

### Frontend
- **Framework**: React Native với Expo
- **Language**: TypeScript
- **Navigation**: React Navigation
- **State Management**: React Context API
- **UI Components**: React Native Components + Ionicons
- **Calendar**: react-native-calendars
- **HTTP Client**: Axios

### Backend
- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: PostgreSQL với Prisma ORM
- **Authentication**: JWT + Firebase Admin (Google Sign-in)
- **2FA**: Speakeasy (TOTP)
- **AI Integration**: Google Generative AI (Gemini 2.0 Flash)
- **API Documentation**: Swagger/OpenAPI
- **Security**: Helmet, CORS, bcrypt/argon2

### Database
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Migrations**: Prisma Migrate
- **Indexes**: Tối ưu cho performance (16+ indexes)

## 📁 Cấu trúc Dự án

```
daily-cook/
├── backend/                 # NestJS Backend
│   ├── src/
│   │   ├── auth/           # Authentication module
│   │   ├── users/          # User management
│   │   ├── recipes/        # Recipe CRUD & favorites
│   │   ├── mealplan/       # Meal planning
│   │   ├── food-log/       # Nutrition tracking
│   │   ├── shopping-list/  # Shopping list
│   │   ├── ai/             # AI integration (Gemini)
│   │   ├── prisma/         # Prisma service
│   │   └── common/         # Shared utilities
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema
│   │   ├── migrations/     # Database migrations
│   │   └── seed.ts         # Seed data
│   └── package.json
│
├── frontend/                # React Native App
│   ├── src/
│   │   ├── screens/        # App screens
│   │   ├── api/            # API clients
│   │   ├── context/        # React Context
│   │   ├── config/         # Configuration
│   │   └── utils/          # Utilities
│   └── package.json
│
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ và npm
- PostgreSQL 14+
- Expo CLI (cho frontend)
- Google Cloud Account (cho Gemini API - optional)

### 1. Clone Repository

```bash
git clone <repository-url>
cd daily-cook
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env với các giá trị của bạn:
# - DATABASE_URL
# - JWT_SECRET
# - GEMINI_API_KEY (optional, cho AI features)

# Generate Prisma Client
npm run prisma:generate

# Run migrations
npm run prisma:migrate

# Seed database (optional)
npm run prisma:seed

# Start development server
npm run start:dev
```

Backend sẽ chạy tại `http://localhost:3000`
API Documentation: `http://localhost:3000/api`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env với API URL:
# - API_URL=http://localhost:3000

# Start Expo development server
npm start
```

Sau đó scan QR code bằng Expo Go app hoặc chạy trên emulator:
- Android: `npm run android`
- iOS: `npm run ios`
- Web: `npm run web`

## 🔐 Environment Variables

### Backend (.env)

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/dailycook?schema=public"

# JWT
JWT_SECRET="your-secret-key-here"
JWT_EXPIRES_IN="7d"

# Firebase (cho Google Sign-in)
FIREBASE_PROJECT_ID="your-project-id"
FIREBASE_PRIVATE_KEY="your-private-key"
FIREBASE_CLIENT_EMAIL="your-client-email"

# Gemini AI (optional)
GEMINI_API_KEY="your-gemini-api-key"

# Server
PORT=3000
NODE_ENV=development
```

### Frontend (.env)

```env
API_URL=http://localhost:3000
```

## 📚 API Documentation

Backend cung cấp Swagger UI tại `http://localhost:3000/api` khi chạy development server.

### Main Endpoints

#### Authentication
- `POST /auth/register` - Đăng ký tài khoản
- `POST /auth/login` - Đăng nhập
- `POST /auth/google` - Google Sign-in
- `POST /auth/forgot-password` - Quên mật khẩu
- `POST /auth/verify-reset-code` - Xác thực mã OTP
- `POST /auth/reset-password` - Đặt lại mật khẩu
- `GET /auth/me` - Lấy thông tin user hiện tại

#### Recipes
- `GET /recipes` - Danh sách recipes (với pagination, search, filter)
- `GET /recipes/:id` - Chi tiết recipe
- `POST /recipes` - Tạo recipe mới
- `GET /recipes/me/favorites` - Recipes yêu thích
- `POST /recipes/:id/favorite` - Thêm vào favorites
- `DELETE /recipes/:id/favorite` - Xóa khỏi favorites

#### Meal Plans
- `GET /mealplans` - Lấy meal plans (với date range)
- `PUT /mealplans` - Tạo/cập nhật meal plan
- `POST /mealplans/suggest-menu` - AI gợi ý thực đơn
- `GET /mealplans/today-suggest` - Gợi ý cho hôm nay
- `PATCH /mealplans/:id/slot` - Cập nhật slot (breakfast/lunch/dinner)
- `POST /mealplans/copy-week` - Copy tuần

#### Food Logs
- `GET /food-logs` - Lấy food logs (với date range)
- `POST /food-logs` - Tạo food log
- `GET /food-logs/stats` - Thống kê dinh dưỡng
- `PATCH /food-logs/:id` - Cập nhật food log
- `DELETE /food-logs/:id` - Xóa food log

#### AI
- `POST /ai/chat` - Chat với AI
- `POST /ai/suggest-from-chat` - Gợi ý món từ chat
- `POST /ai/list-models` - List available models (debug)

#### Users
- `GET /users/me` - Profile hiện tại
- `PATCH /users/me` - Cập nhật profile
- `PATCH /users/me/password` - Đổi mật khẩu
- `GET /users/me/preferences` - Lấy preferences
- `PATCH /users/me/preferences` - Cập nhật preferences

#### Shopping List
- `GET /mealplans/shopping/from-range` - Tạo shopping list từ date range

## 🗄️ Database Schema

### Main Models

- **User**: Thông tin người dùng, authentication
- **UserPreference**: Preferences, mục tiêu dinh dưỡng
- **Recipe**: Món ăn với ingredients, nutrition info
- **RecipeItem**: Quan hệ Recipe-Ingredient với số lượng
- **Ingredient**: Nguyên liệu với nutrition data
- **MealPlan**: Kế hoạch bữa ăn theo ngày
- **FoodLog**: Ghi lại bữa ăn đã ăn
- **ShoppingList**: Danh sách mua sắm
- **UserFavoriteRecipe**: Recipes yêu thích
- **AIRecommendationLog**: Log AI suggestions (cho training)

### Performance Indexes

Schema đã được tối ưu với 16+ indexes cho:
- Date range queries (MealPlan, FoodLog)
- Trending & sorting (Recipe)
- Joins (RecipeItem)
- User-specific queries
- AI training data queries

Xem chi tiết tại `backend/SCHEMA_INDEX_REPORT.md`

## 🤖 AI Integration

### Gemini Setup

1. Tạo Google Cloud Project
2. Enable Generative Language API
3. Tạo API Key
4. Thêm vào `.env`: `GEMINI_API_KEY=your-key`

Xem hướng dẫn chi tiết tại:
- `GEMINI_SETUP.md` - Setup guide
- `GEMINI_ENABLE_API.md` - Enable API steps
- `QUICK_START_GEMINI.md` - Quick start

### Model

- **Default**: `gemini-2.0-flash`
- **Features**: Chat, recipe suggestions, context-aware recommendations

## 📱 Screens

### Authentication & Onboarding
- Launch Screen
- Onboarding (2 screens)
- Sign In / Sign Up
- Forgot Password Flow (3 screens)

### Main Features
- **Home**: Dashboard với today's meals, stats, quick actions
- **Calendar**: Lịch thực đơn hàng tuần
- **Meal Suggest**: AI chat để gợi ý món ăn
- **Nutrition Tracker**: Theo dõi dinh dưỡng
- **Nutrition Goals**: Thiết lập mục tiêu
- **Shopping List**: Danh sách mua sắm
- **Category**: Browse recipes theo category
- **Details**: Chi tiết recipe
- **Favorite Recipes**: Món ăn yêu thích
- **Profile**: Quản lý profile và settings

Xem chi tiết tại `SCREEN_STATUS_REPORT.md`

## 🧪 Development

### Backend Scripts

```bash
npm run start:dev      # Development với hot reload
npm run build          # Build production
npm run start:prod     # Run production
npm run prisma:generate # Generate Prisma Client
npm run prisma:migrate  # Run migrations
npm run prisma:seed     # Seed database
npm run lint           # Lint code
npm run test           # Run tests
```

### Frontend Scripts

```bash
npm start              # Start Expo dev server
npm run android        # Run on Android
npm run ios            # Run on iOS
npm run web            # Run on Web
```

## 🗃️ Database Migrations

```bash
# Create new migration
npm run prisma:migrate

# Apply migrations (production)
npm run prisma:deploy

# Reset database (development only - sẽ mất data!)
npx prisma migrate reset
```

## 📊 Performance

### Database Indexes

Schema đã được tối ưu với indexes cho:
- ✅ Date range queries (MealPlan, FoodLog)
- ✅ Trending & sorting (Recipe)
- ✅ User-specific queries
- ✅ Joins (RecipeItem)
- ✅ AI training data

**Cải thiện dự kiến**: 10-100x nhanh hơn với dataset lớn

## 🔒 Security

- JWT authentication
- Password hashing (bcrypt/argon2)
- 2FA support (TOTP)
- CORS configuration
- Helmet security headers
- Input validation (class-validator)
- SQL injection protection (Prisma)

## 📝 License

UNLICENSED - Private project

## 🤝 Contributing

Dự án này là private. Nếu bạn có quyền truy cập, vui lòng:
1. Tạo feature branch
2. Commit changes
3. Push và tạo Pull Request

## 📞 Support

Nếu có vấn đề, vui lòng:
1. Kiểm tra documentation trong các file `.md`
2. Xem API docs tại `/api` endpoint
3. Kiểm tra logs trong console

## 🎯 Roadmap

### Completed ✅
- [x] Authentication & User Management
- [x] Recipe Management
- [x] Meal Planning
- [x] Nutrition Tracking
- [x] Shopping List
- [x] AI Integration (Gemini)
- [x] Nutrition Goals
- [x] Performance Optimization (Indexes)

### In Progress 🚧
- [ ] Recipe creation UI
- [ ] Advanced analytics
- [ ] Meal plan templates

### Planned 📋
- [ ] Social features (share recipes)
- [ ] Meal prep planning
- [ ] Grocery delivery integration
- [ ] Multi-language support

## 📖 Documentation

- `SCREEN_STATUS_REPORT.md` - Trạng thái các screens
- `SCHEMA_INDEX_REPORT.md` - Database indexes report
- `GEMINI_SETUP.md` - Gemini AI setup guide
- `GEMINI_ENABLE_API.md` - Enable Gemini API
- `QUICK_START_GEMINI.md` - Quick start Gemini
- `GEMINI_MODEL_TROUBLESHOOTING.md` - Troubleshooting

---

**Made with ❤️ for better meal planning and nutrition tracking**
