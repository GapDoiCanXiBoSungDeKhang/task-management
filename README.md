# Task Management System

Đây là dự án học tập cá nhân tập trung vào **Backend** — một REST API quản lý công việc (task) và dự án (project), xây dựng bằng Node.js/Express/TypeScript. Phần Frontend (React + Ant Design) được viết nhanh bằng vibe coding để có giao diện thử nghiệm API, không phải phần trọng tâm của dự án.

Mục tiêu khi làm dự án này là thực hành thiết kế API có đầy đủ các luồng thực tế: xác thực JWT với refresh token, phân quyền theo vai trò (RBAC), quản lý task hỗ trợ cấu trúc cha–con (subtask đệ quy), và tác vụ nền tự động (cron job) như dọn dữ liệu cũ và xuất báo cáo Excel định kỳ.

---

## Quá trình xây dựng

Phần Backend được làm trong quá trình tự học theo hướng backend, có theo dõi và tham khảo các dự án mã nguồn mở trên GitHub cũng như các bài chia sẻ trên mạng xã hội. Trọng tâm học chủ yếu xoay quanh cách thiết kế REST API và test API bằng Postman, song song với việc dựng luồng nghiệp vụ cơ bản (auth, RBAC, CRUD, upload, cron job). Một số thuật toán và hàm hỗ trợ (dựng cây subtask đệ quy, cơ chế hàng đợi refresh token phía Frontend, cron job xuất báo cáo Excel) có dùng ChatGPT để hỗ trợ viết code mẫu và debug lỗi; Gemini được dùng để tìm hiểu thêm về nghiệp vụ, chủ yếu là các luồng quản trị (admin) cơ bản như phân quyền, quản lý task/dự án.

---

## Table of Contents

- [Backend làm được gì](#backend-làm-được-gì)
- [Tech Stack](#tech-stack)
- [System Architecture](#system-architecture)
- [Database Schema](#database-schema)
- [Backend Project Structure](#backend-project-structure)
- [Application Workflows](#application-workflows)
  - [Authentication Flow (JWT + Refresh Token)](#1-authentication-flow-jwt--refresh-token)
  - [Middleware Pipeline — Mỗi request đi qua những gì](#2-middleware-pipeline--mỗi-request-đi-qua-những-gì)
  - [Task Management Flow (kèm Subtask đệ quy)](#3-task-management-flow-kèm-subtask-đệ-quy)
  - [Project Management Flow](#4-project-management-flow)
  - [Role-Based Access Control (RBAC) Flow](#5-role-based-access-control-rbac-flow)
  - [Quên mật khẩu qua OTP + TTL Index](#6-quên-mật-khẩu-qua-otp--ttl-index)
  - [Dashboard & Thống kê tiến độ](#7-dashboard--thống-kê-tiến-độ)
  - [Cron Job — Tác vụ nền tự động](#8-cron-job--tác-vụ-nền-tự-động)
  - [Upload Avatar lên Cloudinary](#9-upload-avatar-lên-cloudinary)
- [API Routes Reference](#api-routes-reference)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)

---

## Backend làm được gì

API được chia thành hai nhóm endpoint với prefix riêng biệt:

**Client API** (`/api/v1/...`) — dành cho người dùng thường (`User`):

| Chức năng | Mô tả |
|---|---|
| Đăng ký / đăng nhập | Hash password bằng bcrypt, trả về access token (1h) + refresh token (7d) |
| Refresh token | Cấp access token mới từ refresh token, không cần đăng nhập lại |
| Quên mật khẩu | Tạo OTP 8 chữ số, lưu vào DB với TTL Index tự xóa sau 2 phút, gửi qua Gmail SMTP |
| Xem task của mình | Trả về task user tạo hoặc được giao, hỗ trợ filter/search/sort/pagination qua query param |
| Subtask | Endpoint riêng trả về cây subtask lồng nhiều cấp (đệ quy theo `taskParentId`) |
| Xem dự án | Chỉ trả về project có user trong `members`, kèm tên người tạo, danh sách thành viên, task |
| Cập nhật trạng thái task | PATCH endpoint nhận `status` mới và cập nhật |
| Hồ sơ cá nhân | Đọc và cập nhật thông tin, avatar được upload lên Cloudinary qua stream |

**Admin API** (`/admin/api/v1/...`) — dành cho quản trị viên (`Account`):

| Chức năng | Mô tả |
|---|---|
| Quản lý task | CRUD đầy đủ. Mỗi action kiểm tra quyền riêng (`tasks_view`, `tasks_create`, `tasks_edit`, `tasks_delete`) |
| Quản lý dự án | CRUD, gán thành viên, theo dõi deadline |
| Trash & Restore | Soft delete → Thùng rác → Khôi phục hoặc xóa vĩnh viễn |
| Bulk action | PATCH `/change-multi` nhận mảng IDs, cập nhật theo `key`/`value` (status, deleted, restore, deleted-permanently) |
| Phân quyền (RBAC) | Tạo role, gán mảng permission string. Kiểm tra quyền ở từng action trong controller, không gắn chung ở route |
| Dashboard | Thống kê số lượng task/dự án theo trạng thái, dữ liệu biểu đồ, danh sách deadline sắp tới |
| Báo cáo tự động | Cron job thứ 2 hàng tuần xuất Excel tiến độ task + dự án gửi qua email |
| Audit trail tự dọn | Cron job hàng ngày xóa entry `updatedBy` cũ hơn 1 tháng khỏi tất cả collection |

---

## Tech Stack

### Backend (trọng tâm)

| Mục đích | Technology | Ghi chú |
|---|---|---|
| Runtime | Node.js | — |
| Ngôn ngữ | TypeScript 5 | Interface riêng cho từng model, mở rộng kiểu `Request` của Express |
| Web Framework | Express.js v5 | — |
| Database | MongoDB + Mongoose | Soft delete, TTL Index, audit trail pattern |
| Xác thực | jsonwebtoken + bcrypt | Access token (1h) + Refresh token (7d), hai namespace tách biệt cho admin và client |
| Cloud Storage | Cloudinary v2 | Upload qua stream buffer, không lưu file tạm trên server |
| Email | Nodemailer + Gmail SMTP | OTP quên mật khẩu + báo cáo định kỳ |
| Cron Job | node-cron | Lịch dọn dữ liệu và gửi báo cáo |
| Xuất báo cáo | exceljs | Tạo file `.xlsx` từ dữ liệu tiến độ |
| Validation | Custom validator middleware | Kiểm tra input trước khi vào controller |
| Dev Tool | ts-node, nodemon | — |

### Frontend (vibe coding — chỉ để thử nghiệm API)

React 18 + TypeScript, Vite, Ant Design v5, React Router DOM v6, Axios, Recharts. Phần frontend được viết nhanh để có giao diện gọi API, không đại diện cho kỹ năng frontend.

---

## System Architecture

```
┌──────────────────────────────────────────────┐
│         FRONTEND (React — vibe coding)       │
│   Gọi API qua Axios với Bearer Token         │
└──────────────────────┬───────────────────────┘
                       │ HTTP Request + Authorization: Bearer {token}
                       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                  EXPRESS BACKEND (TypeScript)                            │
│                                                                          │
│  Hai nhóm route tách biệt:                                               │
│  ┌──────────────────────────┐  ┌───────────────────────────────────────┐ │
│  │   Client API /api/v1/    │  │  Admin API /admin/api/v1/             │ │
│  │  /user  (auth, no guard) │  │  /auth    (no guard)                  │ │
│  │  /tasks    (JWT guard)   │  │  /tasks   (JWT + RBAC guard)          │ │
│  │  /projects (JWT guard)   │  │  /projects                            │ │
│  │  /profile  (JWT guard)   │  │  /accounts                            │ │
│  └──────────┬───────────────┘  │  /roles                               │ │
│             │                  │  /users                               │ │
│             │                  │  /dashboard                           │ │
│             │                  │  /profile                             │ │
│             │                  └──────────────┬────────────────────────┘ │
│             │                                 │                          │
│  ┌──────────▼─────────────────────────────────▼───────────────────────┐  │
│  │                 Auth.requireAuth Middleware                        │  │
│  │                                                                    │  │
│  │  Client: jwt.verify(token, SECRET_KEY)                             │  │
│  │          → User.findOne({ _id, status:"active", deleted:false })   │  │
│  │          → inject req.user                                         │  │
│  │                                                                    │  │
│  │  Admin:  jwt.verify(token, SECRET_KEY)                             │  │
│  │          → Account.findOne({ _id, status:"active", deleted:false })│  │
│  │          → Role.findOne({ _id: account.role_id })                  │  │
│  │          → inject req.account + req.role                           │  │
│  └──────────────────────────┬─────────────────────────────────────────┘  │
│                             │                                            │
│  ┌──────────────────────────▼─────────────────────────────────────────┐  │
│  │                    Controller Layer                                │  │
│  │                                                                    │  │
│  │  Admin controller: kiểm tra từng action riêng                      │  │
│  │  if (!req.role.permissions.includes("tasks_create"))               │  │
│  │    → 403 Forbidden                                                 │  │
│  │                                                                    │  │
│  │  Xử lý filter/search/sort/pagination từ query params               │  │
│  │  Gọi Helper/Service để tính toán phức tạp                          │  │
│  └──────────────────────────┬─────────────────────────────────────────┘  │
│                             │                                            │
│  ┌──────────────────────────▼─────────────────────────────────────────┐  │
│  │               Helper / Service Layer                               │  │
│  │  pagination.ts        — tính skip/limit/totalPage                  │  │
│  │  subTasks.ts          — dựng cây task đệ quy                       │  │
│  │  getProgress.ts       — tính tiến độ từng user                     │  │
│  │  getProgressProjects  — tính tiến độ từng dự án                    │  │
│  │  getChartTasks/Projects — data cho biểu đồ                         │  │
│  │  getDeadline.ts       — task/project sắp hết hạn                   │  │
│  │  systemProgress.ts    — đếm tổng theo trạng thái                   │  │
│  │  setNameProgress.ts   — thay ID bằng tên hiển thị                  │  │
│  │  sendMail.ts          — wrapper Nodemailer                         │  │
│  │  isPassword.ts        — validate độ mạnh mật khẩu                  │  │
│  └──────────────────────────┬─────────────────────────────────────────┘  │
│                             │                                            │
│  ┌──────────────────────────▼─────────────────────────────────────────┐  │
│  │                   Model Layer (Mongoose)                           │  │
│  │  Account | User | Role | Project | Task | ForgotPassword           │  │
│  └──────────────────────────┬─────────────────────────────────────────┘  │
│                             │                                            │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │            Cron Jobs (khởi động cùng server)                       │  │
│  │  cleanUpdatedByJob  — 0 2 * * *  (hàng ngày 2h sáng)               │  │
│  │  reportDataTasks    — 0 8 * * MON (thứ 2, 8h sáng)                 │  │
│  │  reportDataProject  — 0 8 * * MON (thứ 2, 8h sáng)                 │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────┬────────────────────────────────────────────┘
                              │
              ┌───────────────▼──────────────────┐
              │         MongoDB Atlas            │
              │                                  │
              │  accounts    — tài khoản admin   │
              │  users       — người dùng        │
              │  roles       — nhóm quyền        │
              │  projects    — dự án             │
              │  tasks       — công việc         │
              │  forgot-passwords (TTL 120s)     │
              └───────────────┬──────────────────┘
                              │
              ┌───────────────▼──────────────────┐
              │            Cloudinary            │
              │  (avatar upload qua stream)      │
              └──────────────────────────────────┘
```

---

## Database Schema

### `accounts` — Tài khoản Admin

```ts
{
  fullName: String,
  email: String,
  password: String,         // bcrypt hash (saltRounds: 10)
  phone: String,
  avatar: String,           // Cloudinary URL
  role_id: String,          // tham chiếu tới roles._id (lưu dạng String, không dùng ObjectId ref)
  status: "active" | "inactive",
  deleted: Boolean,         // soft delete flag
  createdBy: {
    account_id: String,
    createdAt: Date,
  },
  updatedBy: [{             // mảng — mỗi lần sửa push thêm 1 entry
    account_id: String,
    title: String,          // mô tả ngắn hành động vừa làm
    updatedAt: Date,
  }],
  deletedBy: {
    account_id: String,
    deletedAt: Date,
  },
}
```

### `users` — Tài khoản người dùng (client)

```ts
{
  fullName: String,
  email: String,
  password: String,         // bcrypt hash
  phone: String,
  avatar: String,
  status: "active" | "inactive",
  deleted: Boolean,
  createdBy: { admin_id, createdAt },
  updatedBy: [{ title, admin_id, updatedAt }],
  deletedBy: { admin_id, deletedAt },
  timestamps: true,         // createdAt, updatedAt tự động
}
```

### `roles` — Nhóm quyền

```ts
{
  title: String,
  description: String,
  permissions: [String],    // mảng string, ví dụ:
                            // ["tasks_view", "tasks_create", "tasks_edit", "tasks_delete",
                            //  "projects_view", "projects_create", ...]
  deleted: Boolean,
  createdBy: { account_id, createdAt },
  updatedBy: [{ account_id, title, updatedAt }],
  deletedBy: { account_id, deletedAt },
}
```

### `projects` — Dự án

```ts
{
  title: String,
  description: String,
  deadline: Date,           // default = Date.now + 30 ngày
  status: "active" | "completed" | "archived" | "inactive",
  members: [String],        // mảng user_id / account_id — không phân biệt loại
  deleted: Boolean,
  createdBy: {
    createdById: String,    // account_id người tạo
    createdAt: Date,
  },
  updatedBy: [{
    title: String,
    updatedById: String,
    updatedAt: Date,
  }],
  deletedBy: {
    deletedById: String,
    deletedAt: Date,
  },
}
```

### `tasks` — Công việc (hỗ trợ subtask nhiều cấp)

```ts
{
  title: String,
  status: "initial" | "doing" | "finish" | "pending" | "notFinish",
  content: String,
  createdBy: String,        // account_id người tạo (admin tạo task)
  projectId: String,        // task thuộc project nào (optional)
  taskParentId: String,     // nếu có → task này là subtask của task cha
                            // nếu rỗng → task gốc (root)
  listUsers: [String],      // danh sách user/account được giao việc
  timeStart: Date,
  timeFinish: Date,
  deleted: Boolean,
  deletedAt: Date,
  timestamps: true,
}
```

> **Cách subtask hoạt động:** Task tự tham chiếu chính nó qua `taskParentId`. Không giới hạn số cấp lồng. Helper `getSubTask` dựng cây bằng đệ quy khi cần.

### `forgot-passwords` — OTP quên mật khẩu

```ts
{
  email: String,
  otp: String,              // 8 chữ số ngẫu nhiên
  expireAt: {
    type: Date,
    default: Date.now,
  },
  // Index: forgotPasswordSchema.index({ expireAt: 1 }, { expireAfterSeconds: 120 })
  // → MongoDB tự xóa document sau 120 giây kể từ khi tạo
}
```

---

## Backend Project Structure

```
Backend/
├── src/
│   ├── index.ts                        # Entry point
│   │                                   # - Khởi tạo Express app
│   │                                   # - connectDB()
│   │                                   # - Đăng ký routes (client + admin)
│   │                                   # - Khởi động tất cả cron jobs
│   │                                   # - Cấu hình CORS từ biến môi trường
│   │
│   ├── config/
│   │   ├── db.ts                       # mongoose.connect()
│   │   └── system.ts                   # Hằng số: prefixAdmin="/admin", prefixTrash="/trash"
│   │
│   ├── models/                         # Mongoose schema
│   │   ├── accounts.model.ts
│   │   ├── users.model.ts
│   │   ├── roles.model.ts
│   │   ├── projects.model.ts
│   │   ├── tasks.model.ts
│   │   └── forgotPassword.model.ts     # TTL Index 120 giây
│   │
│   ├── interfaces/                     # TypeScript interface khớp với schema
│   │   ├── accounts.interface.ts
│   │   ├── users.interface.ts
│   │   ├── roles.interface.ts
│   │   └── tasks.interface.ts
│   │
│   ├── types/
│   │   └── express/index.d.ts          # Mở rộng kiểu Request của Express:
│   │                                   # req.user (IUser), req.account (IAccount), req.role (IRole)
│   │
│   ├── helpers/                        # Hàm tiện ích dùng chung
│   │   ├── pagination.ts               # Tính skip, limit, totalPage từ query
│   │   ├── subTasks.ts                 # Đệ quy dựng cây task cha–con
│   │   ├── getProgressSystem.ts        # Đếm tổng task theo từng trạng thái
│   │   ├── sendMail.ts                 # Wrapper Nodemailer
│   │   └── isPassword.ts              # Validate: có chữ thường, có số, không có space, 8–16 ký tự
│   │
│   ├── cron/
│   │   ├── cleanUpdatedBy.ts           # Mỗi ngày 2h: xóa entry updatedBy cũ hơn 1 tháng
│   │   │                               # (Account, Role, User, Project)
│   │   └── report.ts                   # Thứ 2 hàng tuần 8h: xuất Excel + gửi email
│   │                                   # (reportDataTasks + reportDataProject)
│   │
│   └── api/v1/
│       ├── admin/
│       │   ├── middlewares/
│       │   │   └── auth.middleware.ts  # requireAuth: verify JWT → Account → Role
│       │   │                           # inject req.account + req.role
│       │   ├── controllers/
│       │   │   ├── auth.controller.ts          # login, refresh-token (admin)
│       │   │   ├── dashboards.controller.ts    # progress, projects-progress, chart, system
│       │   │   ├── tasks.controller.ts         # CRUD + trash + change-multi
│       │   │   ├── projects.controller.ts      # CRUD + trash + change-multi
│       │   │   ├── accounts.controller.ts      # CRUD tài khoản admin
│       │   │   ├── roles.controller.ts         # CRUD role + gán permissions
│       │   │   ├── users.controller.ts         # Quản lý user client
│       │   │   ├── profile.controller.ts       # Xem/sửa hồ sơ admin đang đăng nhập
│       │   │   └── replacePassword.controller.ts
│       │   ├── routes/
│       │   │   └── index.route.ts      # Mount tất cả admin routes với Auth.requireAuth
│       │   ├── services/               # Logic tính toán tách khỏi controller
│       │   │   ├── getProgress.ts      # Tính tiến độ task theo điều kiện lọc
│       │   │   ├── getProgressProjects.ts
│       │   │   ├── getChartTasks.ts    # Đếm task theo trạng thái → data biểu đồ
│       │   │   ├── getChartProjects.ts
│       │   │   ├── getDeadline.ts      # Task/project sắp hết hạn (< 3 ngày)
│       │   │   ├── systemProgress.ts   # Tổng số task toàn hệ thống
│       │   │   ├── setNameProgress.ts  # Thay ID người dùng bằng tên hiển thị
│       │   │   └── setNameUser.ts
│       │   └── validators/             # Middleware kiểm tra input trước controller
│       │       ├── create.validator.ts
│       │       ├── edit.validator.ts
│       │       ├── delete.validator.ts
│       │       ├── detail.validator.ts
│       │       ├── change-status.validator.ts
│       │       ├── restore.validator.ts
│       │       └── login.validator.ts
│       │
│       └── client/
│           ├── middlewares/
│           │   ├── auth.middleware.ts  # requireAuth: verify JWT → User → inject req.user
│           │   └── uploadCloud.middleware.ts  # Multer buffer → Cloudinary stream upload
│           ├── controllers/
│           │   ├── users.controller.ts         # register, login, refresh-token, logout,
│           │   │                               # forgotPassword, otpPassword, resetPassword
│           │   ├── tasks.controller.ts         # index, detail, subtasks, listUsers,
│           │   │                               # create, edit, delete, changeStatus, changeMulti
│           │   ├── projects.controller.ts      # index, detail, listMember, listTasks
│           │   └── profile.controller.ts       # profile, editProfile
│           ├── routes/
│           │   └── index.route.ts      # Mount client routes, /user không cần auth
│           ├── services/
│           │   └── generateRandom.ts   # typeString(n), typeNumber(n) — tạo chuỗi/số ngẫu nhiên
│           └── validators/
│               ├── user.validator.ts   # register, login, forgot, otp, reset
│               ├── create.validator.ts
│               ├── edit.validator.ts
│               ├── delete.validator.ts
│               ├── detail.validator.ts
│               └── change-status.validator.ts
│
├── package.json
├── tsconfig.json
└── .env
```

---

## Application Workflows

### 1. Authentication Flow (JWT + Refresh Token)

Dự án dùng hai cặp token tách biệt: một cho admin (`Account`), một cho user client (`User`). Hai namespace hoàn toàn độc lập, không bị nhầm lẫn.

```
[Đăng ký — Client]
POST /api/v1/user/register { fullName, email, password, confirmPassword }
  ├─→ validator: kiểm tra required, format email, confirmPassword khớp
  ├─→ User.findOne({ email }) → nếu tồn tại: 409 Conflict
  ├─→ bcrypt.hash(password, 10)
  ├─→ delete req.body.confirmPassword
  ├─→ new User(req.body).save()
  └─→ 201 Created — "Đăng ký thành công, vui lòng đăng nhập"
      (không cấp token ngay, bắt phải login riêng)

[Đăng nhập — Client]
POST /api/v1/user/login { email, password }
  ├─→ User.findOne({ email })
  ├─→ Kiểm tra user.deleted === false
  ├─→ bcrypt.compare(password, user.password)
  ├─→ Kiểm tra user.status === "active"
  ├─→ jwt.sign({ userId, fullName, status }, SECRET_KEY, { expiresIn: "1h" })
  ├─→ jwt.sign({ userId, fullName, status }, REFRESH_SECRET, { expiresIn: "7d" })
  └─→ 200 OK { accessToken, refreshToken }

[Đăng nhập — Admin]
POST /admin/api/v1/auth/login { email, password }
  ├─→ Account.findOne({ email })
  ├─→ bcrypt.compare(password, account.password)
  ├─→ Kiểm tra account.status === "active"
  ├─→ jwt.sign({ userId, fullName, status }, SECRET_KEY, { expiresIn: "1h" })
  ├─→ jwt.sign({ userId, fullName, status }, REFRESH_SECRET, { expiresIn: "7d" })
  └─→ 200 OK { accessToken, refreshToken }
      (cùng SECRET_KEY với client nhưng Frontend lưu tách biệt: admin_accessToken vs accessToken)

[Cấp lại Access Token khi hết hạn]
POST /api/v1/user/refresh-token { refreshToken }
  ├─→ jwt.verify(refreshToken, REFRESH_SECRET)
  ├─→ User.findOne({ _id: decoded.userId, deleted: false, status: "active" })
  ├─→ jwt.sign(payload, SECRET_KEY, { expiresIn: "1h" })
  └─→ 200 OK { accessToken }
      (refreshToken không đổi cho đến khi hết hạn 7 ngày)
```

---

### 2. Middleware Pipeline — Mỗi request đi qua những gì

```
Mọi request vào /api/v1/* (trừ /user/register, /user/login, /user/refresh-token):

[1] Auth.requireAuth (client middleware)
    ├─→ Đọc: req.headers.authorization?.split(" ")[1]
    ├─→ Nếu không có token: 401 Unauthorized
    ├─→ jwt.verify(token, SECRET_KEY)
    │     Nếu token hết hạn hoặc sai: 403 Forbidden
    ├─→ User.findOne({ _id: decoded.userId, status:"active", deleted:false })
    │     .lean().select("-password -createdBy -updatedBy -deletedBy")
    │     Nếu không tìm thấy: 403 Forbidden
    └─→ req.user = user → next()

[2] Validator middleware (nếu route có gắn)
    ├─→ Kiểm tra các trường bắt buộc trong req.body hoặc req.params
    └─→ Nếu thiếu: trả lỗi validation ngay, không vào controller

[3] Controller
    └─→ Xử lý business logic + trả response

---

Mọi request vào /admin/api/v1/* (trừ /auth/login, /auth/refresh-token):

[1] Auth.requireAuth (admin middleware)
    ├─→ Đọc token từ Authorization header
    ├─→ jwt.verify(token, SECRET_KEY)
    ├─→ Account.findOne({ _id, status:"active", deleted:false })
    │     .lean().select("-password -createdBy -updatedBy -deletedBy")
    ├─→ Role.findOne({ _id: account.role_id })
    │     → Lấy toàn bộ role gồm cả permissions[]
    └─→ req.account = account; req.role = role → next()

[2] Validator middleware

[3] Controller — kiểm tra RBAC từng action
    if (!req.role.permissions.includes("tasks_create")) → 403
    → Xử lý logic
```

---

### 3. Task Management Flow (kèm Subtask đệ quy)

```
[Admin tạo task]
POST /admin/api/v1/tasks/create
  ├─→ requireAuth → validator.create → controller
  ├─→ Kiểm tra: req.role.permissions.includes("tasks_create") → 403 nếu thiếu
  ├─→ req.body.createdBy = req.account._id
  ├─→ new Task({ title, content, projectId, listUsers, timeStart, timeFinish,
  │              taskParentId })   ← nếu truyền taskParentId → tạo subtask
  └─→ 201 Created { data: newTask }

[Admin tạo subtask cho task đã có]
POST /admin/api/v1/tasks/create { taskParentId: "parentId", title, ... }
  └─→ Task tự tham chiếu: taskParentId = ID của task cha
      Không giới hạn số cấp lồng

[Client lấy danh sách task]
GET /api/v1/tasks?status=doing&keyword=auth&sort_key=title&sort_value=asc&page=2&limit=4
  ├─→ filter = {
  │     deleted: false,
  │     $or: [{ createdBy: req.user._id }, { listUsers: req.user._id }]
  │   }
  ├─→ Nếu có status: filter.status = status
  ├─→ Nếu có keyword: filter.title = new RegExp(keyword, "i")
  ├─→ sort = { [sort_key]: sort_value } — mặc định { title: "desc" }
  ├─→ pagination(defaultConfig, totalCount, req.query)
  │     → tính skip = (page - 1) * limit, totalPage
  └─→ Task.find(filter).sort(sort).skip(skip).limit(limit)

[Lấy cây subtask]
GET /api/v1/tasks/detail/:id/subtasks
  └─→ helper getSubTask(id):

      const getSubTask = async (parentId: string) => {
        const tasks = await Task.find({
          taskParentId: parentId,
          deleted: false
        }).lean();

        const results = [];
        for (const task of tasks) {
          const childs = await getSubTask(task._id.toString()); // gọi đệ quy
          results.push({ ...task, childs });
        }
        return results;
      };

      → Trả về cây lồng tùy ý:
      { _id, title, status, childs: [
          { _id, title, status, childs: [
              { _id, title, status, childs: [] }
          ]}
      ]}

[Soft delete task]
DELETE /admin/api/v1/tasks/delete/:id
  └─→ Task.updateOne({ _id: id }, { deleted: true })
      Không có deletedBy trong task (khác với Project/Account/Role)

[Khôi phục từ Trash]
PATCH /admin/api/v1/tasks/trash/restore/:id
  └─→ Task.updateOne({ _id: id, deleted: true }, { deleted: false })

[Bulk action]
PATCH /admin/api/v1/tasks/change-multi { ids: [...], key: "deleted", value: true }
  ├─→ Nếu key === "deleted": tự set value = true
  └─→ Task.updateMany({ _id: { $in: ids }, deleted: false }, { [key]: value })
      key có thể là: "deleted", "status", "restore", "deleted-permanently"
```

---

### 4. Project Management Flow

```
[Admin tạo dự án]
POST /admin/api/v1/projects/create
  { title, description, deadline, members: ["userId1", "accountId2", ...] }
  ├─→ Kiểm tra quyền "projects_create"
  ├─→ req.body.createdBy = { createdById: req.account._id }
  ├─→ deadline mặc định = Date.now + 30 ngày (nếu không truyền)
  └─→ new Project(req.body).save()

[Sửa dự án — ghi audit]
PATCH /admin/api/v1/projects/edit/:id
  ├─→ Kiểm tra quyền "projects_edit"
  ├─→ Project.findOne({ _id: id, deleted: false }) → 404 nếu không có
  ├─→ updatedBy = { updatedById: req.account._id, title: "Cập nhật thông tin dự án", updatedAt: Date.now() }
  └─→ Project.updateOne({ _id }, {
        ...req.body,
        $push: { updatedBy: updatedBy }   // push, không replace cả mảng
      })

[Client xem dự án mình tham gia]
GET /api/v1/projects
  ├─→ filter = { deleted: false, members: req.user._id }
  │       → chỉ trả về project có user trong mảng members
  ├─→ Filter thêm theo status/deadline (query)
  ├─→ Search theo keyword trên title + description
  ├─→ Pagination + sort
  ├─→ Sau khi lấy xong, loop để enrich tên người tạo:
  │     Account.findOne({ _id: project.createdBy.createdById })
  │     → project.createdBy.fullName = account.fullName
  └─→ Trả về projects[]

[Xem thành viên dự án]
GET /api/v1/projects/detail/:id/list-member
  ├─→ Project.findOne({ _id, deleted: false }).select("members")
  ├─→ Account.find({ _id: { $in: members }, deleted: false }).select("fullName")
  ├─→ User.find({ _id: { $in: members }, deleted: false }).select("fullName")
  └─→ { data: { admin: [...accounts], user: [...users] } }
      (members lưu chung một mảng, phân loại bằng cách query cả 2 collection)

[Bulk change-multi cho project]
PATCH /admin/api/v1/projects/change-multi { ids, key, value }
  switch (key):
    "deleted"             → { deleted: value, deletedBy: {...} }
    "status"              → { status: value, $push: { updatedBy: {...} } }
    "restore"             → { deleted: false, $push: { updatedBy: {...} } }
    "deleted-permanently" → Project.deleteMany({ _id: { $in: ids }, deleted: true })
```

---

### 5. Role-Based Access Control (RBAC) Flow

```
Permission string format: "{module}_{action}"

Danh sách permissions hiện tại:
  tasks_view     tasks_create     tasks_edit     tasks_delete
  projects_view  projects_create  projects_edit  projects_delete
  accounts_view  accounts_create  accounts_edit  accounts_delete
  roles_view     roles_create     roles_edit     roles_delete
  users_view     users_create     users_edit     users_delete

Cách hoạt động:

1. Admin tạo role và gán permissions:
   POST /admin/api/v1/roles/create
   { title: "Project Manager", permissions: ["tasks_view", "tasks_create", "projects_view", "projects_edit"] }

2. Gán role cho account:
   PATCH /admin/api/v1/accounts/edit/:id { role_id: "roleId" }

3. Mỗi request admin:
   Auth.requireAuth:
   ├─→ Lấy account từ JWT
   └─→ Role.findOne({ _id: account.role_id }) → req.role.permissions

4. Trong từng action của controller:
   controller.create = async (req, res) => {
     // Kiểm tra quyền riêng cho action này
     if (!req.role.permissions.includes("tasks_create")) {
       return res.status(403).json({ success: false, message: "Bạn không có quyền truy cập" });
     }
     // ... xử lý tạo task
   }

   controller.delete = async (req, res) => {
     // Action khác → permission khác
     if (!req.role.permissions.includes("tasks_delete")) {
       return res.status(403).json({ ... });
     }
     // ... xử lý xóa
   }

Lý do kiểm tra ở controller thay vì ở route:
  Nếu dùng middleware ở route thì chỉ chặn được theo method+path,
  không phân biệt được "xem" với "sửa" trong cùng một route pattern.
  Đặt ở controller cho phép từng action có permission string riêng.
```

---

### 6. Quên mật khẩu qua OTP + TTL Index

```
[Bước 1] POST /api/v1/user/password/forgot { email }
  ├─→ userValidator.forgotPassword: kiểm tra email hợp lệ
  ├─→ User.findOne({ email, deleted: false }) → 404 nếu không có
  ├─→ otp = generateRandom.typeNumber(8)  // 8 chữ số ngẫu nhiên
  ├─→ new ForgotPassword({ email, otp }).save()
  │     Model có TTL Index: expireAfterSeconds: 120
  │     → MongoDB tự xóa document sau 120 giây kể từ khi tạo
  ├─→ sendMail({ to: email, subject: "...", html: `<p>Mã OTP: <b>${otp}</b></p>...` })
  └─→ 200 OK "Đã gửi mã OTP vào email"

[Bước 2] POST /api/v1/user/password/otp { email, otp }
  ├─→ ForgotPassword.findOne({ email, otp })
  │     → Nếu không tìm thấy: OTP sai hoặc đã hết hạn (document đã bị TTL xóa)
  ├─→ User.findOne({ email, deleted: false })
  ├─→ Cấp accessToken + refreshToken mới (không yêu cầu mật khẩu)
  └─→ 200 OK { accessToken, refreshToken }

[Bước 3] POST /api/v1/user/password/reset { password }
  ├─→ Auth.requireAuth: dùng token cấp ở bước 2 → xác định được user
  ├─→ userValidator.resetPassword: kiểm tra password hợp lệ
  ├─→ isValidPassword(password): có chữ thường, có số, không space, 8–16 ký tự
  ├─→ bcrypt.hash(password, 10)
  └─→ User.updateOne({ _id: req.user.id }, { password: hash })
```

---

### 7. Dashboard & Thống kê tiến độ

```
[Thống kê tổng quan hệ thống]
GET /admin/api/v1/dashboard/system
  └─→ systemProgress(): gọi getValueSystem helper
        → Task.countDocuments()                    // tổng
        → Task.countDocuments({ status: "finish" })
        → Task.countDocuments({ status: "notFinish" })
        → Task.countDocuments({ status: "pending" })
        → Task.countDocuments({ status: "doing" })
        → Task.countDocuments({ status: "initial" })
      Trả về object số liệu tổng toàn hệ thống

[Tiến độ task theo điều kiện lọc]
GET /admin/api/v1/dashboard/progress
  Query params: status, userId, from, to, keyword, sort_key, sort_value, page, limit

  Controller flow:
  1. Xây dựng condition từ query params
  2. pagination(defaultConfig, totalCount, req.query)
  3. progress = await getProgress(condition, sort, pagination)
     → Tính completion rate từng task/user
  4. await makeNameUserInfo(progress)
     → Thay createdBy ID bằng fullName (query Account hoặc User)
  5. deadline = await getDeadline()
     → Lấy task/project có timeFinish < Date.now + 3 ngày
  └─→ { data: progress, pagination, deadline }

[Data cho biểu đồ]
GET /admin/api/v1/dashboard/chart
  ├─→ chartTask = await getChartTasks()
  │     → Đếm task theo từng status value → { initial: N, doing: N, finish: N, ... }
  └─→ chartProject = await getChartProjects()
        → Đếm project theo từng status value
      Trả về { chartTask, chartProject } → Frontend dùng Recharts vẽ
```

---

### 8. Cron Job — Tác vụ nền tự động

Tất cả cron job được khởi động trong `index.ts` ngay khi server start. Chạy độc lập, không liên quan đến request từ client.

```
[cleanUpdatedByJob — chạy hàng ngày lúc 2h sáng]
Lịch: "0 2 * * *"

Áp dụng cho 4 collection: Account, Role, User, Project

Với mỗi collection:
  Model.updateMany(
    {},                                  // tất cả document
    {
      $pull: {
        updatedBy: {
          updatedAt: { $lt: oneMonthAgo }  // xóa entry cũ hơn 1 tháng
        }
      }
    }
  )

Lý do cần job này:
  updatedBy là mảng, mỗi lần sửa push thêm 1 entry.
  Nếu không dọn định kỳ, mảng phình to vô hạn theo thời gian.
  Chỉ giữ lại lịch sử 1 tháng gần nhất.

---

[reportDataTasks — chạy thứ 2 hàng tuần lúc 8h sáng]
Lịch: "0 8 * * MON"

1. progressTask = await getProgress()      // lấy tiến độ task toàn hệ thống
2. Tạo workbook bằng exceljs:
   worksheet.addRow(["User ID", "initial", "doing", "finish", "pending", "notFinish", "completionRate"])
   for (const task of progressTask) {
     worksheet.addRow([task.userId, task.initial, task.doing, task.finish,
                       task.pending, task.notFinish, task.completionRate?.toFixed(2) || 0])
   }
3. buffer = await workbook.xlsx.writeBuffer()
4. sendMail({ to: "...", subject: "Báo cáo tiến độ task", attachments: buffer })

[reportDataProject — chạy thứ 2 hàng tuần lúc 8h sáng]
Lịch: "0 8 * * MON"

Tương tự nhưng cho dữ liệu project:
   Columns: Project Id, title, total, onTime, late, overdue, inProgress, completionRate
```

---

### 9. Upload Avatar lên Cloudinary

```
PATCH /api/v1/profile/edit   (multipart/form-data)
PATCH /admin/api/v1/profile/edit

Route setup:
  router.patch(
    "/edit",
    Auth.requireAuth,
    multer({ storage: memoryStorage() }).single("avatar"),  // file vào req.file.buffer
    uploadCloud.upload,                                      // xử lý upload
    controller.editProfile
  )

uploadCloud.middleware.ts:
  upload: async (req, res, next) => {
    if (!req.file) return next();   // nếu không có file thì bỏ qua

    // Tạo write stream lên Cloudinary
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: "avatars" },
      (error, result) => {
        if (error) return next(error);
        req.body[req.file.fieldname] = result.url;  // gán URL vào req.body.avatar
        next();
      }
    );

    // Pipe buffer vào stream — không lưu file tạm trên server
    streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
  }

controller.editProfile:
  └─→ User.updateOne({ _id: req.user.id }, req.body)
        req.body.avatar lúc này đã là Cloudinary URL
```

---

## API Routes Reference

### Client API (`/api/v1/...`)

| Method | Path | Mô tả | Auth |
|---|---|---|---|
| POST | `/api/v1/user/register` | Đăng ký | — |
| POST | `/api/v1/user/login` | Đăng nhập | — |
| POST | `/api/v1/user/refresh-token` | Cấp access token mới | — |
| POST | `/api/v1/user/logout` | Đăng xuất | — |
| POST | `/api/v1/user/password/forgot` | Gửi OTP | — |
| POST | `/api/v1/user/password/otp` | Xác thực OTP | — |
| POST | `/api/v1/user/password/reset` | Đặt lại mật khẩu | Required |
| GET | `/api/v1/user/list` | Danh sách user active (dropdown giao việc) | Required |
| GET | `/api/v1/tasks` | Task của tôi (filter/search/sort/page) | Required |
| GET | `/api/v1/tasks/detail/:id` | Chi tiết task | Required |
| GET | `/api/v1/tasks/detail/:id/subtasks` | Cây subtask (đệ quy) | Required |
| GET | `/api/v1/tasks/detail/:id/list-user` | Người được giao task (phân theo admin/user) | Required |
| POST | `/api/v1/tasks/create` | Tạo task | Required |
| PATCH | `/api/v1/tasks/edit/:id` | Sửa task | Required |
| DELETE | `/api/v1/tasks/delete/:id` | Xóa mềm task | Required |
| PATCH | `/api/v1/tasks/change-status/:id` | Đổi trạng thái | Required |
| PATCH | `/api/v1/tasks/change-multi` | Đổi trạng thái nhiều task | Required |
| GET | `/api/v1/projects` | Dự án tôi tham gia | Required |
| GET | `/api/v1/projects/detail/:id` | Chi tiết dự án | Required |
| GET | `/api/v1/projects/detail/:id/list-member` | Thành viên (phân admin/user) | Required |
| GET | `/api/v1/projects/detail/:id/list-tasks` | Task thuộc dự án | Required |
| GET | `/api/v1/profile` | Hồ sơ cá nhân | Required |
| PATCH | `/api/v1/profile/edit` | Sửa hồ sơ + avatar | Required |

### Admin API (`/admin/api/v1/...`)

| Method | Path | Mô tả | Permission |
|---|---|---|---|
| POST | `/admin/api/v1/auth/login` | Đăng nhập admin | — |
| POST | `/admin/api/v1/auth/refresh-token` | Cấp lại access token | — |
| GET | `/admin/api/v1/dashboard/progress` | Tiến độ task (có filter) | Auth |
| GET | `/admin/api/v1/dashboard/projects-progress` | Tiến độ dự án | Auth |
| GET | `/admin/api/v1/dashboard/chart` | Data biểu đồ task + project | Auth |
| GET | `/admin/api/v1/dashboard/system` | Tổng số liệu hệ thống | Auth |
| GET | `/admin/api/v1/dashboard/dropdowns` | Dropdown user/account cho filter | Auth |
| GET | `/admin/api/v1/tasks` | Danh sách task (filter/search/sort/page) | `tasks_view` |
| GET | `/admin/api/v1/tasks/detail/:id` | Chi tiết task | `tasks_view` |
| GET | `/admin/api/v1/tasks/detail/:id/subtasks` | Cây subtask | `tasks_view` |
| POST | `/admin/api/v1/tasks/create` | Tạo task (hoặc subtask) | `tasks_create` |
| PATCH | `/admin/api/v1/tasks/edit/:id` | Sửa task | `tasks_edit` |
| DELETE | `/admin/api/v1/tasks/delete/:id` | Xóa mềm | `tasks_delete` |
| PATCH | `/admin/api/v1/tasks/change-status/:id` | Đổi trạng thái | `tasks_edit` |
| PATCH | `/admin/api/v1/tasks/change-multi` | Bulk action (ids + key + value) | `tasks_edit` |
| GET | `/admin/api/v1/tasks/trash` | Thùng rác task | `tasks_view` |
| PATCH | `/admin/api/v1/tasks/trash/restore/:id` | Khôi phục từ Trash | `tasks_edit` |
| PATCH | `/admin/api/v1/tasks/trash/change-multi` | Bulk restore/delete-permanently | `tasks_edit` |
| DELETE | `/admin/api/v1/tasks/trash/delete-permanently/:id` | Xóa vĩnh viễn | `tasks_delete` |
| GET | `/admin/api/v1/projects` | Danh sách dự án | `projects_view` |
| GET | `/admin/api/v1/projects/detail/:id` | Chi tiết dự án | `projects_view` |
| POST | `/admin/api/v1/projects/create` | Tạo dự án | `projects_create` |
| PATCH | `/admin/api/v1/projects/edit/:id` | Sửa dự án | `projects_edit` |
| DELETE | `/admin/api/v1/projects/delete/:id` | Xóa mềm | `projects_delete` |
| PATCH | `/admin/api/v1/projects/change-status/:id` | Đổi trạng thái | `projects_edit` |
| PATCH | `/admin/api/v1/projects/change-multi` | Bulk action | `projects_edit` |
| GET | `/admin/api/v1/projects/trash` | Thùng rác dự án | `projects_view` |
| PATCH | `/admin/api/v1/projects/trash/restore/:id` | Khôi phục | `projects_edit` |
| DELETE | `/admin/api/v1/projects/trash/delete-permanently/:id` | Xóa vĩnh viễn | `projects_delete` |
| GET | `/admin/api/v1/accounts` | Danh sách tài khoản admin | `accounts_view` |
| GET | `/admin/api/v1/accounts/detail/:id` | Chi tiết tài khoản | `accounts_view` |
| POST | `/admin/api/v1/accounts/create` | Tạo tài khoản | `accounts_create` |
| PATCH | `/admin/api/v1/accounts/edit/:id` | Sửa tài khoản | `accounts_edit` |
| DELETE | `/admin/api/v1/accounts/delete/:id` | Xóa mềm | `accounts_delete` |
| GET | `/admin/api/v1/roles` | Danh sách role | `roles_view` |
| POST | `/admin/api/v1/roles/create` | Tạo role + gán permissions | `roles_create` |
| PATCH | `/admin/api/v1/roles/edit/:id` | Sửa role | `roles_edit` |
| DELETE | `/admin/api/v1/roles/delete/:id` | Xóa role | `roles_delete` |
| GET | `/admin/api/v1/users` | Danh sách user client | `users_view` |
| GET | `/admin/api/v1/users/detail/:id` | Chi tiết user | `users_view` |
| PATCH | `/admin/api/v1/users/edit/:id` | Sửa user (khóa/mở tài khoản) | `users_edit` |
| GET | `/admin/api/v1/profile` | Hồ sơ admin đang đăng nhập | Auth |
| PATCH | `/admin/api/v1/profile/edit` | Sửa hồ sơ + avatar | Auth |

---

## Environment Variables

```env
# Server
PORT=3000

# MongoDB Atlas
MONGO_URL=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<dbname>

# JWT
SECRET_KEY=your_jwt_access_secret          # dùng cho access token (1h)
REFRESH_SECRET=your_jwt_refresh_secret     # dùng cho refresh token (7d)

# Email — Gmail App Password
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password           # Tạo tại Google Account → Security → App Passwords

# Cloudinary
CLOUD_NAME=your_cloud_name
API_KEY=your_api_key
API_SECRET=your_api_secret

# CORS — danh sách origin được phép gọi API, phân cách bằng dấu phẩy
CORS=http://localhost:5173,https://your-frontend.vercel.app
```

> File `.env` đã có trong `.gitignore`. Không commit lên repository.

---

## Getting Started

### Yêu cầu

- Node.js >= 18.x
- MongoDB Atlas account (hoặc local MongoDB)
- Cloudinary account
- Gmail account với App Password

### Chạy Backend

```bash
cd Backend
yarn install

# Tạo file .env theo mẫu ở trên

yarn dev
# Server chạy tại http://localhost:3000
# Sử dụng ts-node + nodemon, tự restart khi có thay đổi
```

### Build production

```bash
yarn build   # tsc → output vào /dist
yarn start   # node dist/index.js
```

### Tạo tài khoản Admin đầu tiên

Chưa có flow đăng ký admin qua API. Cần insert thủ công vào MongoDB:

```js
// collection: "accounts"
{
  fullName: "Admin",
  email: "admin@example.com",
  password: "<bcrypt_hash>",   // dùng bcrypt.hash("your_password", 10) để tạo
  status: "active",
  deleted: false,
  role_id: "<_id của role có đủ quyền>"
}

// collection: "roles"
{
  title: "Super Admin",
  permissions: [
    "tasks_view", "tasks_create", "tasks_edit", "tasks_delete",
    "projects_view", "projects_create", "projects_edit", "projects_delete",
    "accounts_view", "accounts_create", "accounts_edit", "accounts_delete",
    "roles_view", "roles_create", "roles_edit", "roles_delete",
    "users_view", "users_create", "users_edit", "users_delete"
  ],
  deleted: false
}
```

---

## Author

Dự án cá nhân, tập trung thực hành backend: thiết kế API REST, xác thực JWT, phân quyền RBAC, tác vụ nền với cron job, và các pattern phổ biến trong MongoDB như soft delete và audit trail.