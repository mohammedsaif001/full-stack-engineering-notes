# Production-Grade Express Architecture: Feature-First Design, DTOs, Auth & Security
## Comprehensive Guide to Enterprise Project Structures, DTO Validation, Mongoose ODM, JWT Auth & Error Handling

---

## 📌 Executive Summary

- **Enterprise Project Structuring**:
  - **Layer-First (Horizontal Slice)**: Global `/controllers`, `/services`, `/routes` folders. Simple for small scripts, unmaintainable at scale.
  - **Feature-First / Modular (Vertical Slice)**: Grouping all files by business domain (`/modules/auth/`, `/modules/cart/`) alongside a shared `/common/` kernel. The gold standard for production backends.
- **URI vs URL vs URN**:
  - **URI (Identifier)**: The overarching superset naming or locating a resource.
  - **URL (Locator)**: Specifies *where* and *how* to access a resource (protocol + domain + path).
  - **URN (Name)**: Specifies a resource's persistent identity without location (e.g. `urn:isbn:0451450523`).
- **Database Abstraction: Direct SQL vs ORM vs ODM vs OData**:
  - **Direct Driver / SQL**: Raw query execution (`pg`, `mysql2`, `mongodb`). Maximum speed, but vulnerable to injection without parameterization and lacks schema validation.
  - **ORM (Object-Relational Mapping)**: Maps relational tables (PostgreSQL/MySQL) to OOP models (Prisma, TypeORM, Drizzle).
  - **ODM (Object-Document Mapping)**: Maps document collections (MongoDB) to schema models (Mongoose).
  - **OData (Open Data Protocol)**: Standardized protocol enabling rich client querying (`$filter`, `$orderby`, `$expand`) over REST.
- **DTOs (Data Transfer Objects) & Validation**:
  - **DTO**: Architectural design pattern defining data contracts between network boundaries.
  - **DTO vs Zod / Joi**: DTO is the *pattern*; Zod/Joi are the *validation engines* enforcing the DTO contract at runtime.
- **Enterprise Authentication Architecture**:
  - **Short-Lived Access Tokens** (15m, in-memory / Bearer header) + **Long-Lived Refresh Tokens** (7d, hashed in DB, `httpOnly` secure cookies).
  - Pre-save password hashing with `bcrypt` salt rounds.
  - Email verification & Password reset token lifecycles with `nodemailer`.
  - Role-Based Access Control (**RBAC**) middleware (`authorize(['admin', 'seller'])`).
- **Standardized API Contract**:
  - `ApiResponse` class for consistent JSON envelopes.
  - Centralized `ApiError` hierarchy for operational vs programming error handling.

---

## 🧠 Core Analogies

- **Feature-First vs Layer-First Architecture as Kitchen Organization**:
  - **Layer-First**: Storing all utensils in one giant drawer on floor 1, all spices in a pantry on floor 2, and all pans in the basement. Every time you cook an omelet (feature), you run across all 3 floors.
  - **Feature-First**: Creating specialized cooking stations (Baking Station, Pasta Station, Grill Station). Each station has its own pans, ingredients, and utensils right at hand.
- **DTO as Customs Border Control**:
  - Unsanitized client requests are international cargo shipments. The **DTO** is the customs declaration checklist. If contraband fields exist (e.g. `isAdmin: true` injected by a malicious user), the DTO strips or rejects them before they can reach the database layer.
- **Access Token + Refresh Token as a Hotel Keycard & Passport**:
  - **Access Token**: The RFID plastic room keycard. Works quickly at elevator and room doors, but expires after a short time (15 mins).
  - **Refresh Token**: Your government passport stored safely in the manager's safe. Used only when the keycard expires to verify identity and issue a new keycard without logging in again from scratch.

---

## 🌐 1. Architectural Taxonomies: URI vs URL vs URN

```
┌────────────────────────────────────────────────────────────────────────┐
│                   URI (Uniform Resource Identifier)                    │
│                 "The Overarching Umbrella Identifier"                  │
├───────────────────────────────────┬────────────────────────────────────┤
│   URL (Uniform Resource Locator)  │    URN (Uniform Resource Name)     │
│   "WHERE it is & HOW to get it"   │    "WHAT it is (Identity only)"    │
├───────────────────────────────────┼────────────────────────────────────┤
│ • `https://api.site.com/v1/users` │ • `urn:isbn:0451450523`            │
│ • `ftp://files.org/data.csv`      │ • `urn:uuid:6ba7b810-9dad-11d1`   │
│ • `mailto:support@domain.com`     │ • `urn:ietf:rfc:7231`              │
└───────────────────────────────────┴────────────────────────────────────┘
```

> **Key Rule**: *"All URLs are URIs, but not all URIs are URLs."* A URL must specify the access protocol (`http`, `https`, `ftp`) and network location.

---

## 🗄️ 2. Database Layer: Direct SQL vs ORM vs ODM vs OData

```
┌────────────────────────────────────────────────────────────────────────┐
│                        DATABASE ACCESS SPECTRUM                        │
├─────────────────┬─────────────────┬─────────────────┬──────────────────┤
│ Mechanism       │ Category        │ Target DBs      │ Popular Tools    │
├─────────────────┼─────────────────┼─────────────────┼──────────────────┤
│ **Direct Call** │ Raw Driver/SQL  │ SQL / NoSQL     │ `pg`, `mysql2`,  │
│                 │                 │                 │ `mongodb` driver │
├─────────────────┼─────────────────┼─────────────────┼──────────────────┤
│ **ORM**         │ Object-Relational│ Relational      │ Prisma, Drizzle, │
│                 │ Mapping         │ (Postgres/MySQL)│ TypeORM, Sequelize│
├─────────────────┼─────────────────┼─────────────────┼──────────────────┤
│ **ODM**         │ Object-Document │ Document NoSQL  │ Mongoose         │
│                 │ Mapping         │ (MongoDB)       │                  │
├─────────────────┼─────────────────┼─────────────────┼──────────────────┤
│ **OData**       │ Query Protocol  │ REST API Layer  │ Apache Olingo,   │
│                 │                 │ (Over HTTP)     │ Microsoft OData  │
└─────────────────┴─────────────────┴──────────────────┴──────────────────┘
```

### Why use an ORM/ODM instead of Direct Database Calls?
1. **Schema Integrity & Type Safety**: ORMs/ODMs validate types, default values, and required fields before sending network packets to the DB.
2. **SQL Injection Defense**: Automatically parameterizes query inputs to eliminate injection vectors.
3. **Relationship Management**: Simplifies complex foreign key joins, cascading deletes, and document referencing (`.populate()`).
4. **Lifecycle Hooks & Middleware**: Allows pre-save and post-save triggers (e.g. hashing passwords automatically on `userSchema.pre('save')`).
5. **Database Portability**: Write query builder logic once; switch between PostgreSQL, MySQL, and SQLite with minimal code changes.

---

## 📦 3. Data Transfer Objects (DTO) & Validation Strategy

### What is a DTO?
A **DTO (Data Transfer Object)** is an architectural design pattern. It is a plain object definition that specifies the exact shape and types of data moving across network boundaries (between Client $\to$ Controller $\to$ Service).

```
Client Payload ──▶ [ DTO Validation Middleware ] ──▶ Sanitized DTO ──▶ Controller ──▶ Service Layer
                          │
                   (Invalid Data)
                          │
                          ▼
                 400 Bad Request (ApiError)
```

### DTO Pattern vs Validation Libraries (Zod / Joi)
- **DTO**: The **Design Pattern** (the architectural blueprint for request contracts).
- **Zod / Joi**: The **Validation Libraries** (the runtime tools that enforce the DTO rules).

```javascript
// DTO Implementation using Joi / Class Schema (src/common/dto/base.dto.js)
import Joi from 'joi';

export class BaseDto {
  static schema = Joi.object({});

  static validate(data) {
    const { error, value } = this.schema.validate(data, {
      abortEarly: false,     // Collect all validation errors, not just the first one
      stripUnknown: true,   // Security: Strip out unpermitted injected fields!
    });

    if (error) {
      const errors = error.details.map((d) => d.message);
      return { errors, value: null };
    }

    return { errors: null, value };
  }
}
```

---

## 🏗️ 4. Enterprise Folder Structures: Layer-First vs Feature-First

### Pattern A: Layer-First Structure (Horizontal Slice)
```text
src/
├── controllers/
│   ├── auth.controller.js
│   └── cart.controller.js
├── middlewares/
│   └── auth.middleware.js
├── models/
│   ├── user.model.js
│   └── cart.model.js
├── routes/
│   ├── auth.routes.js
│   └── cart.routes.js
└── services/
    ├── auth.service.js
    └── cart.service.js
```
*Verdict*: Suitable only for small MVPs. As the app scales to 30+ models, developers must juggle 5 disconnected directories for every single feature change.

---

### Pattern B: Feature-First Modular Structure (Vertical Slice - Production Standard)
Every business domain lives inside its own self-contained module:

```text
express-setup/
├── server.js                          # Process bootstrap, DB connect & port listening
├── .env                               # Secret environment variables (gitignored)
├── .env.example                       # Committed environment template
├── docker-compose.yml                 # Local MongoDB & service containers
└── src/
    ├── app.js                         # Express app factory & global middleware pipeline
    ├── common/                        # Shared infrastructure kernel
    │   ├── config/
    │   │   ├── db.js                  # Resilient database connection
    │   │   └── email.js               # Nodemailer SMTP transporter
    │   ├── middleware/
    │   │   └── validate.middleware.js # Generic DTO validation middleware
    │   └── utils/
    │       ├── api-response.js        # Standardized API response class
    │       ├── api-error.js           # Custom operational error class
    │       └── jwt.utils.js           # Access/Refresh token cryptography
    ├── dto/
    │   └── base.dto.js                # Base DTO validation engine
    └── modules/                       # Domain feature modules
        ├── auth/                      # 🔐 Authentication & Authorization Module
        │   ├── auth.controller.js     # Request/Response formatting & cookie handling
        │   ├── auth.service.js        # Pure business logic & database transactions
        │   ├── auth.routes.js         # Endpoint definitions & middleware mounting
        │   ├── auth.middleware.js     # Token verification & RBAC role checks
        │   ├── auth.model.js          # Mongoose schema & pre-save bcrypt hooks
        │   └── dto/                   # Feature-specific request contracts
        │       ├── register.dto.js
        │       ├── login.dto.js
        │       ├── forgot-password.dto.js
        │       └── reset.dto.js
        └── cart/                      # 🛒 Cart Domain Module (Controller, Service, Routes)
```

---

## 💻 5. Complete Production Code Walkthrough

Below are the core enterprise components extracted from the production setup.

---

### 1. Server Bootstrap & Lifecycle Management (`server.js`)

The `server.js` file is the operational entry point of the application. It bootstraps external resources (database connection, environment variables) before opening network ports to incoming traffic.

```javascript
import "dotenv/config";
import app from "./src/app.js";
import connectDB from "./src/common/config/db.js";

const PORT = process.env.PORT || 5000;

const start = async () => {
  // 1. Establish database connection FIRST
  await connectDB();

  // 2. Open HTTP socket listener only after database is ready
  app.listen(PORT, () => {
    console.log(`Server is running at ${PORT} in ${process.env.NODE_ENV} mode`);
  });
};

// 3. Catch fatal bootstrap errors and terminate with exit code 1
start().catch((err) => {
  console.error("Failed to start the server", err);
  process.exit(1);
});
```

#### 🔍 Architectural Breakdown of `server.js`:
- **`import "dotenv/config"`**: Evaluated synchronously at the very top (Phase 0) before any other module runs, guaranteeing that `process.env` is populated for all subsequent imports.
- **Why `await connectDB()` BEFORE `app.listen()`**: Database-first startup pattern. If the database is down, opening the port immediately would cause client requests to pile up, hang, and timeout. By awaiting connection first, the server guarantees it can actually service requests before accepting socket traffic.
- **Why `process.exit(1)` on Failure**: Exit code `1` signals a fatal failure to process managers and container orchestrators (Docker, Kubernetes, PM2, systemd). A non-zero exit code stops Kubernetes from marking the pod as healthy in readiness probes and triggers automated restart/alert policies.

---

### 2. Application Factory & Global Pipeline (`src/app.js`)

The `src/app.js` file configures the Express application instance, global parsing middlewares, domain routing, and the global 404 catch-all handler.

```javascript
import cookieParser from "cookie-parser";
import express from "express";
import authRoute from "./modules/auth/auth.routes.js";
import { ApiError } from "./common/utils/api-error.js";

const app = express();

// Core Global Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Mount Domain Feature Routes
app.use("/api/auth", authRoute);

// Catch-all 404 Handler for undefined routes
app.all("{*path}", (req, res) => {
  throw ApiError.notFound(`Route ${req.originalUrl} not found`);
});

export default app;
```

#### 🔍 Architectural Breakdown of `src/app.js`:
- **`cookieParser()`**: Parses the incoming `Cookie` header and populates `req.cookies`. This is critical for reading `httpOnly` secure Refresh Tokens on protected routes.
- **`express.urlencoded({ extended: true })`**: Parses URL-encoded form submissions (supports nested objects/arrays via the `qs` library).
- **`app.all("{*path}", ...)`**: Catch-all route using Express wildcard pattern matching to intercept any HTTP verb (`GET`, `POST`, `PUT`, `DELETE`) on any undefined URL path and immediately throw a structured `ApiError.notFound` JSON response rather than leaking default HTML 404 pages.
- **Decoupled Export**: Exporting `app` without calling `listen()` allows direct, zero-port-conflict automated integration testing with tools like Supertest.

---

### 3. Standardized Response & Error Contracts (`src/common/utils/`)

#### `api-response.js`
```javascript
export class ApiResponse {
  constructor(statusCode, message = "Success", data = null) {
    this.success = statusCode >= 200 && statusCode < 300;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
  }

  static ok(res, message, data = null) {
    return res.status(200).json(new ApiResponse(200, message, data));
  }

  static created(res, message, data = null) {
    return res.status(201).json(new ApiResponse(201, message, data));
  }

  static noContent(res) {
    return res.status(204).end();
  }
}
```

#### `api-error.js`
```javascript
export class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // Identifies expected client/operational errors
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = "Bad Request") {
    return new ApiError(400, message);
  }

  static unauthorized(message = "Unauthorized Access") {
    return new ApiError(401, message);
  }

  static forbidden(message = "Forbidden Action") {
    return new ApiError(403, message);
  }

  static notFound(message = "Resource Not Found") {
    return new ApiError(404, message);
  }

  static conflict(message = "Conflict State") {
    return new ApiError(409, message);
  }

  static internal(message = "Internal Server Error") {
    return new ApiError(500, message);
  }
}
```

---

### 4. Generic DTO Validation Middleware (`src/common/middleware/validate.middleware.js`)

```javascript
import { ApiError } from '../utils/api-error.js';

export const validate = (DtoClass) => {
  return (req, res, next) => {
    const { errors, value } = DtoClass.validate(req.body);

    if (errors) {
      // Replaces unvalidated payload and aborts with standard 400
      throw ApiError.badRequest(errors.join('; '));
    }

    // Replaces raw body with sanitized, stripped, typed data
    req.body = value;
    next();
  };
};
```

---

### 5. Feature DTO: Register Contract (`src/modules/auth/dto/register.dto.js`)

```javascript
import Joi from 'joi';
import { BaseDto } from '../../../dto/base.dto.js';

export class RegisterDto extends BaseDto {
  static schema = Joi.object({
    name: Joi.string().trim().min(2).max(50).required().messages({
      'string.empty': 'Name cannot be blank',
      'any.required': 'Name is a required field',
    }),
    email: Joi.string().email().lowercase().trim().required(),
    password: Joi.string()
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
      .required()
      .messages({
        'string.pattern.base':
          'Password must contain at least 8 characters, one uppercase, one lowercase, one number, and one special character',
      }),
    role: Joi.string().valid('customer', 'seller').default('customer'),
  });
}
```

---

### 6. Mongoose Domain Model & Password Hashing (`src/modules/auth/auth.model.js`)

```javascript
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false }, // Omit from queries by default
    role: { type: String, enum: ['customer', 'seller', 'admin'], default: 'customer' },
    isVerified: { type: Boolean, default: false },
    verificationToken: { type: String, select: false },
    refreshToken: { type: String, select: false },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

// Mongoose Pre-Save Hook: Automatically hash password before persistence
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12); // 12 salt rounds
  next();
});

// Instance Method: Compare clear-text password with stored hash
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('User', userSchema);
```

---

### 7. Authentication Service Layer (`src/modules/auth/auth.service.js`)

```javascript
import crypto from 'crypto';
import User from './auth.model.js';
import { ApiError } from '../../common/utils/api-error.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../../common/utils/jwt.utils.js';
import { sendVerificationEmail } from '../../common/config/email.js';

class AuthService {
  // 1. User Registration
  async register({ name, email, password, role }) {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw ApiError.conflict('An account with this email already exists');
    }

    // Generate secure random verification token
    const rawVerificationToken = crypto.randomBytes(32).toString('hex');
    const hashedVerificationToken = crypto.createHash('sha256').update(rawVerificationToken).digest('hex');

    const user = await User.create({
      name,
      email,
      password,
      role,
      verificationToken: hashedVerificationToken,
    });

    // Send verification email via Nodemailer
    await sendVerificationEmail(email, rawVerificationToken);

    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.verificationToken;
    return userObj;
  }

  // 2. User Login
  async login({ email, password }) {
    const user = await User.findOne({ email }).select('+password');
    if (!user) throw ApiError.unauthorized('Invalid email or password');

    const isMatch = await user.comparePassword(password);
    if (!isMatch) throw ApiError.unauthorized('Invalid email or password');

    if (!user.isVerified) {
      throw ApiError.forbidden('Please verify your email before logging in');
    }

    // Generate JWT Keypair
    const accessToken = generateAccessToken({ id: user._id, role: user.role });
    const refreshToken = generateRefreshToken({ id: user._id });

    // Hash refresh token before saving in database
    user.refreshToken = crypto.createHash('sha256').update(refreshToken).digest('hex');
    await user.save({ validateBeforeSave: false });

    const userObj = user.toObject();
    delete userObj.password;
    delete userObj.refreshToken;

    return { user: userObj, accessToken, refreshToken };
  }

  // 3. Token Rotation (Refresh Access Token)
  async refreshTokens(rawRefreshToken) {
    if (!rawRefreshToken) throw ApiError.unauthorized('Refresh token is required');

    const decoded = verifyRefreshToken(rawRefreshToken);
    const user = await User.findById(decoded.id).select('+refreshToken');
    if (!user) throw ApiError.unauthorized('User no longer exists');

    const hashedIncomingToken = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
    if (user.refreshToken !== hashedIncomingToken) {
      throw ApiError.unauthorized('Invalid or compromised refresh token');
    }

    const newAccessToken = generateAccessToken({ id: user._id, role: user.role });
    return { accessToken: newAccessToken };
  }

  // 4. Logout (Invalidate Refresh Token)
  async logout(userId) {
    await User.findByIdAndUpdate(userId, { refreshToken: null });
  }
}

export default new AuthService();
```

---

### 8. Authentication Controller Layer (`src/modules/auth/auth.controller.js`)

```javascript
import authService from './auth.service.js';
import { ApiResponse } from '../../common/utils/api-response.js';

class AuthController {
  async register(req, res) {
    const user = await authService.register(req.body);
    return ApiResponse.created(res, 'Registration successful. Please check email for verification link.', user);
  }

  async login(req, res) {
    const { user, accessToken, refreshToken } = await authService.login(req.body);

    // Set secure HTTP-Only cookie for refresh token
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,                                // Inaccessible to JavaScript (XSS defense)
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict',                            // CSRF defense
      maxAge: 7 * 24 * 60 * 60 * 1000,              // 7 days
    });

    return ApiResponse.ok(res, 'Login successful', { user, accessToken });
  }

  async refresh(req, res) {
    const token = req.cookies.refreshToken || req.body.refreshToken;
    const tokens = await authService.refreshTokens(token);
    return ApiResponse.ok(res, 'Token refreshed successfully', tokens);
  }

  async logout(req, res) {
    await authService.logout(req.user.id);
    res.clearCookie('refreshToken');
    return ApiResponse.ok(res, 'Logged out successfully');
  }

  async getMe(req, res) {
    return ApiResponse.ok(res, 'User profile fetched', req.user);
  }
}

export default new AuthController();
```

---

### 9. Auth Middleware & Role-Based Access Control (`src/modules/auth/auth.middleware.js`)

```javascript
import { ApiError } from '../../common/utils/api-error.js';
import { verifyAccessToken } from '../../common/utils/jwt.utils.js';
import User from './auth.model.js';

// 1. Authenticate Token (Who are you?)
export const authenticate = async (req, res, next) => {
  let token;
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  if (!token) throw ApiError.unauthorized('Authentication required: Token missing');

  try {
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id);

    if (!user) throw ApiError.unauthorized('User token is no longer valid');

    req.user = { id: user._id, email: user.email, name: user.name, role: user.role };
    next();
  } catch (err) {
    throw ApiError.unauthorized('Invalid or expired token');
  }
};

// 2. Authorize Roles (What are you allowed to do?)
export const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user.role)) {
      throw ApiError.forbidden('You do not have sufficient permissions to access this resource');
    }
    next();
  };
};
```

---

### 10. Feature Routing Setup (`src/modules/auth/auth.routes.js`)

```javascript
import { Router } from 'express';
import authController from './auth.controller.js';
import { authenticate, authorize } from './auth.middleware.js';
import { validate } from '../../common/middleware/validate.middleware.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';

const router = Router();

// Public Routes
router.post('/register', validate(RegisterDto), authController.register);
router.post('/login', validate(LoginDto), authController.login);
router.post('/refresh', authController.refresh);

// Protected Routes
router.get('/me', authenticate, authController.getMe);
router.post('/logout', authenticate, authController.logout);

// Role Protected Route (Admin Only)
router.get('/admin/stats', authenticate, authorize(['admin']), (req, res) => {
  res.json({ stats: 'Secret revenue figures' });
});

export default router;
```

---

## 🎯 6. Summary & Quick Revision Checklist

- [ ] **URI vs URL vs URN**: URL provides location/protocol; URN provides persistent name; URI is the superset.
- [ ] **Database Layer**: Choose Mongoose ODM for MongoDB to leverage schema casting, validation, and pre-save hooks.
- [ ] **Feature-First Architecture**: Group code by business modules (`modules/auth`, `modules/cart`) rather than horizontal layers.
- [ ] **DTO Pattern**: Use DTOs with Joi/Zod to validate, sanitize (`stripUnknown: true`), and standardize request payloads.
- [ ] **Standardized JSON Envelopes**: Wrap all successes in `ApiResponse` and operational failures in `ApiError`.
- [ ] **JWT Token Strategy**: Issue 15-minute Access Tokens (Bearer header) and 7-day Refresh Tokens (hashed in DB, stored in `httpOnly` secure cookies).
- [ ] **RBAC Security**: Enforce role checks using `authorize(['admin', 'seller'])` after `authenticate`.
