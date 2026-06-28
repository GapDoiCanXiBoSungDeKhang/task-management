import express, { Application } from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';

// Load environment variables
dotenv.config();

// Database
import { connectDB } from './config/db';

// ===> Connect to MongoDB
connectDB();

// Routes
import routerApiClientVer1 from './api/v1/client/routes/index.route';
import routerApiAdminVer1 from './api/v1/admin/routes/index.route';

// cron
import { cleanUpdatedByJobAccount } from './cron/cleanUpdatedBy';
import { cleanUpdatedByJobRole } from './cron/cleanUpdatedBy';
import { cleanUpdatedByJobUser } from './cron/cleanUpdatedBy';
import { cleanUpdatedByJobProject } from './cron/cleanUpdatedBy';
import { reportDataTasks } from './cron/report';
import { reportDataProject } from './cron/report';

// Initialize Express
const app: Application = express();
const port = process.env.PORT;

// cookie parser
app.use(cookieParser());

// parse application/json
app.use(bodyParser.json());

// cors
// Cấu hình CORS chi tiết
// Danh sách origin được phép gọi API
const allowedOrigins = process.env.CORS?.split(",") || [];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Cho phép request từ Postman / server nội bộ (origin có thể undefined)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Cho phép cookie / Authorization header
};

app.use(cors(corsOptions));

// Thêm middleware options ở đây
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).json({});
  }
  next();
});

// cron
cleanUpdatedByJobAccount();
cleanUpdatedByJobRole();
cleanUpdatedByJobUser();
cleanUpdatedByJobProject();
reportDataTasks();
reportDataProject();

// Routes
// => v1
routerApiClientVer1(app);
routerApiAdminVer1(app);

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
