# DevQuery Forum

A modern, Stack Overflow-style Q&A platform where every question receives instant AI-generated answers through background processing, while maintaining the ability for human responses.

---

## 📚 Quick Start for Instructors

> **For Educators**: This section helps you quickly understand the project architecture and teaching flow.

### 🎯 Project Overview (60 Seconds)

**What is it?**
A production-ready Q&A platform (like Stack Overflow) with AI-powered instant answers using GPT-5, image analysis via Vision API, auto-tagging, voting/reputation system, and full authentication.

**What makes it unique?**
- **Next.js 16** (latest RC with App Router) + **React 19** (cutting edge)
- **Tailwind CSS v4** (brand new architecture)
- **TanStack Query** centralized pattern (enterprise-level)
- **Inngest** event-driven background jobs (modern async pattern)
- **Better Auth** (OAuth + email/password, simpler than NextAuth)
- **Type-safe throughout** (Drizzle ORM + Zod validation + TypeScript)

**Core Learning Outcomes for Students:**
1. Modern Next.js 16 patterns (App Router, Server Components, Server Actions)
2. Type-safe database with Drizzle ORM
3. Advanced state management with TanStack Query (caching, optimistic updates)
4. Event-driven architecture with Inngest (background jobs)
5. AWS S3 presigned URLs (secure image uploads)
6. OpenAI API integration (GPT-5 + Vision)
7. Authentication with Better Auth (simpler modern alternative)
8. Production patterns (rate limiting, validation, error handling)

---

### 🏗️ Architecture Diagrams

#### 1. Request Flow (User Interactions)
```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       │ User creates question
       ↓
┌─────────────────────────────────────────────────┐
│           Next.js 16 (App Router)               │
│  ┌──────────────────────────────────────────┐  │
│  │  1. Server Component renders form        │  │
│  │  2. Client Component handles upload      │  │
│  │  3. TanStack Mutation submits data       │  │
│  └──────────────────────────────────────────┘  │
└──────────────────┬──────────────────────────────┘
                   │
                   │ POST /api/questions
                   ↓
┌─────────────────────────────────────────────────┐
│              API Route Handler                  │
│  ┌──────────────────────────────────────────┐  │
│  │  1. Validate with Zod schema             │  │
│  │  2. Check rate limit (Upstash Redis)     │  │
│  │  3. Insert to database (Drizzle ORM)     │  │
│  │  4. Send event to Inngest                │  │
│  └──────────────────────────────────────────┘  │
└──────────────────┬──────────────────────────────┘
                   │
                   ↓
        ┌──────────────────┐
        │  Neon Postgres   │
        │   (Serverless)   │
        └──────────────────┘
```

#### 2. Background Job Flow (AI Answer Generation)
```
┌──────────────────┐
│  Question Created│
└────────┬─────────┘
         │
         │ Emit event: "question.created"
         ↓
┌─────────────────────────────────────────────────┐
│               Inngest Cloud                     │
│  ┌──────────────────────────────────────────┐  │
│  │  Receives event, triggers function       │  │
│  │  Retry logic, concurrency control        │  │
│  └──────────────────────────────────────────┘  │
└──────────────────┬──────────────────────────────┘
                   │
                   │ Step 1: Fetch question data
                   ↓
        ┌──────────────────────┐
        │  GET /api/questions  │
        │  (with images array) │
        └──────────┬───────────┘
                   │
                   │ Step 2: Get image URLs if present
                   ↓
        ┌──────────────────────┐
        │  POST /api/upload/   │
        │    image-url         │
        └──────────┬───────────┘
                   │
                   │ Step 3: Call OpenAI
                   ↓
        ┌──────────────────────┐
        │   OpenAI GPT-5       │
        │  (+ Vision API for   │
        │   image analysis)    │
        └──────────┬───────────┘
                   │
                   │ Step 4: Generate tags with GPT-5 Mini
                   ↓
        ┌──────────────────────┐
        │   OpenAI GPT-5 Mini  │
        │   (cost-optimized)   │
        └──────────┬───────────┘
                   │
                   │ Step 5: Save answer + tags to DB
                   ↓
        ┌──────────────────────┐
        │    Neon Postgres     │
        │   (answers + tags)   │
        └──────────────────────┘
```

#### 3. Authentication Flow (Better Auth)
```
┌─────────────┐
│  User Login │
└──────┬──────┘
       │
       ├─────── Email/Password ──────┐
       │                             │
       └─────── OAuth (GitHub/Google)┘
                       │
                       ↓
            ┌──────────────────────┐
            │   Better Auth API    │
            │   /api/auth/*        │
            └──────────┬───────────┘
                       │
                       │ Verify credentials
                       ↓
            ┌──────────────────────┐
            │   Database Check     │
            │   (users table)      │
            └──────────┬───────────┘
                       │
                       │ Create session token
                       ↓
            ┌──────────────────────┐
            │   HTTP-only Cookie   │
            │   (secure session)   │
            └──────────┬───────────┘
                       │
                       │ Send event: "user.created"
                       ↓
            ┌──────────────────────┐
            │  Inngest Function    │
            │  (welcome email)     │
            └──────────────────────┘
```

---

### 🎬 Suggested Teaching Approach

**Video Structure (3-3.5 hours total):**

1. **Introduction & Setup (20 min)**
   - Project overview and tech stack
   - Environment setup and dependencies
   - Project structure walkthrough

2. **Database & Schema (25 min)**
   - Neon Postgres setup
   - Drizzle ORM introduction
   - Complete schema walkthrough (users, questions, answers, votes, tags)
   - Database relationships

3. **Authentication System (30 min)**
   - Better Auth configuration
   - Email/password authentication
   - OAuth setup (GitHub & Google)
   - Session management

4. **Questions Feature (35 min)**
   - Question list with pagination
   - Question detail page
   - Creating questions with markdown editor
   - Form validation with Zod

5. **Answers & Voting (25 min)**
   - Answer submission
   - Voting system (upvote/downvote)
   - Accept answer feature
   - Reputation system

6. **User Profiles & Search (20 min)**
   - User profile pages
   - Profile editing
   - Full-text search implementation

7. **AI Integration with Inngest (30 min)**
   - Inngest setup and event-driven architecture
   - GPT-5 answer generation
   - Vision API for image analysis
   - Auto-tagging with GPT-5 Mini
   - Email notifications

8. **Image Uploads with S3 (20 min)**
   - AWS S3 bucket setup
   - Presigned URLs concept
   - Direct browser-to-S3 uploads
   - Image display

9. **TanStack Query Pattern (25 min)**
   - Centralized query management
   - Query hooks and caching
   - Mutation hooks
   - Optimistic updates
   - Cache invalidation strategies

10. **Production Features (15 min)**
    - Rate limiting with Upstash Redis
    - Error handling
    - Deployment to Vercel

**Teaching Tips:**
- Start with the **database schema** (`lib/db/schema.ts`) - it's the foundation
- Show the **request flow**: Component → API Route → Database → Inngest
- Emphasize **type safety**: TypeScript → Drizzle → Zod validation
- Live code the TanStack Query patterns to show caching in action
- Highlight **modern patterns**: Server Components, centralized queries, event-driven jobs

---

### 🔑 Key Code Patterns (Quick Reference)

#### Pattern 1: TanStack Query (GET operations)
```typescript
// lib/queries/questions.ts
import { useQuery } from "@tanstack/react-query";
import { api, questionKeys } from "@/lib/api";

export const useQuestion = (id: string) => {
  return useQuery({
    queryKey: questionKeys.detail(id),
    queryFn: () => api.questions.getById(id),
    staleTime: 30_000, // Cache for 30 seconds
  });
};
```

#### Pattern 2: TanStack Mutation (POST/PUT/DELETE)
```typescript
// lib/mutations/votes.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, questionKeys } from "@/lib/api";

export const useVote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: api.votes.vote,
    onMutate: async (variables) => {
      // Optimistic update - UI updates instantly
      const previousData = queryClient.getQueryData(
        questionKeys.detail(variables.itemId)
      );
      // Update cache immediately...
      return { previousData };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      queryClient.setQueryData(
        questionKeys.detail(_variables.itemId),
        context?.previousData
      );
    },
    onSuccess: () => {
      // Invalidate to refetch from server
      queryClient.invalidateQueries({ queryKey: questionKeys.all });
    },
  });
};
```

#### Pattern 3: Inngest Background Function
```typescript
// inngest/functions/generate-ai-answer.ts
import { inngest } from "@/lib/inngest";
import { openai } from "@/lib/openai";

export const generateAIAnswer = inngest.createFunction(
  {
    id: "generate-ai-answer",
    name: "Generate AI Answer for Question",
    concurrency: { limit: 5 }, // Max 5 concurrent
  },
  { event: "question.created" }, // Trigger
  async ({ event, step }) => {
    // Step 1: Fetch question
    const question = await step.run("fetch-question", async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/questions/${event.data.questionId}`);
      return res.json();
    });

    // Step 2: Call OpenAI with vision
    const answer = await step.run("generate-answer", async () => {
      const messages = [
        {
          role: "user",
          content: [
            { type: "text", text: question.content },
            // Add images if present
            ...imageUrls.map((url) => ({
              type: "image_url",
              image_url: { url },
            })),
          ],
        },
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-5",
        messages,
      });

      return completion.choices[0].message.content;
    });

    // Step 3: Save to database
    await step.run("save-answer", async () => {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/answers`, {
        method: "POST",
        body: JSON.stringify({
          questionId: question.id,
          content: answer,
          userId: "ai-bot",
        }),
      });
    });
  }
);
```

#### Pattern 4: Drizzle Schema (Type-safe Database)
```typescript
// lib/db/schema.ts
import { pgTable, text, integer, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const questions = pgTable("questions", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  authorId: text("author_id").notNull(),
  images: text("images").array(), // Array of image keys
  votes: integer("votes").default(0),
  viewCount: integer("view_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  authorIdx: index("questions_author_idx").on(table.authorId),
}));

// Type inference - use in your code
export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;
```

---

### 💡 What Students Will Learn

1. **Modern Next.js 16** - App Router, Server Components, streaming
2. **Type Safety End-to-End** - TypeScript + Drizzle + Zod
3. **Enterprise State Management** - TanStack Query patterns
4. **Event-Driven Architecture** - Inngest for background jobs
5. **AI Integration** - OpenAI GPT-5 + Vision API
6. **Cloud Services** - AWS S3, Neon Postgres, Upstash Redis
7. **Authentication** - Better Auth with OAuth
8. **Production Patterns** - Rate limiting, validation, error handling

---

## 📖 For Students: Complete Guide

### Features

- **Instant AI Responses**: Every question gets an AI-generated answer within seconds using GPT-5
- **GPT-5 Vision Support**: AI can analyze images attached to questions (up to 4 images per question)
- **Smart Auto-Tagging**: AI automatically categorizes and tags questions using GPT-5 Mini
- **Image Upload**: Upload up to 4 images per question/answer using AWS S3 presigned URLs
- **Full-Text Search**: Fast PostgreSQL-powered search across questions and answers
- **Rate Limiting**: Upstash Redis-based rate limiting (10 requests per 10 seconds)
- **Voting & Reputation**: Stack Overflow-style voting system with reputation points
  - Upvote question/answer: +5 reputation
  - Downvote: -2 reputation
  - Accepted answer: +15 reputation
- **User Profiles**: Comprehensive user profiles showing stats, questions, and answers
- **Full Authentication**: Email/password (8+ chars) + OAuth (GitHub & Google) with Better Auth
- **Event-Driven Architecture**: Reliable background processing with Inngest
- **Answer Management**: Accept best answer, delete answers, vote on answers
- **Email Notifications**: Welcome emails, answer notifications, accepted answer alerts
- **Modern UI**: Beautiful, responsive design with Tailwind CSS v4 and shadcn/ui
- **Serverless-First**: Built for scale using Neon Postgres and Vercel

---

### Tech Stack

#### Frontend
- **Next.js 16.0.1** - Latest RC with App Router, TypeScript 5
- **React 19.2.0** - Cutting-edge React with new compiler
- **Tailwind CSS v4** - Latest version with new architecture
- **shadcn/ui** - 14+ high-quality UI components
- **TanStack Query 5.90.6** - Powerful data synchronization
- **React Hook Form 7.66.0** - Performant form handling
- **Zod 4.1.12** - TypeScript-first schema validation
- **Lucide React 0.552.0** - Beautiful icon library
- **next-themes** - Dark/light mode support

#### Content Rendering
- **react-markdown 10.1.0** - Markdown rendering
- **react-syntax-highlighter 16.1.0** - Code highlighting
- **remark-gfm 4.0.1** - GitHub Flavored Markdown
- **rehype-raw 7.0.0** - HTML in Markdown support

#### Backend & Database
- **Next.js API Routes** - RESTful API endpoints
- **TypeScript 5.3+** - Full type safety
- **Better Auth 1.3.34** - Modern authentication library
  - Email/password authentication
  - OAuth (GitHub & Google)
  - Session management with cookies
- **Drizzle ORM 0.44.7** - Type-safe SQL query builder
- **Neon Postgres** (@neondatabase/serverless 1.0.2) - Serverless PostgreSQL
- **Inngest 3.44.4** - Event-driven background job processing
  - AI answer generation
  - Email notifications
  - Reliable execution with retries

#### AI & Services
- **OpenAI 6.7.0** - AI-powered answers and tagging
  - GPT-5 for main answers with vision support
  - GPT-5 Mini for auto-tagging (cost-optimized)
- **AWS S3** - Image storage with presigned URLs
  - @aws-sdk/client-s3 3.922.0
  - @aws-sdk/s3-request-presigner 3.922.0
- **Upstash Redis** - Rate limiting with sliding window
  - @upstash/ratelimit 2.0.7
  - @upstash/redis 1.35.6
- **Resend 6.4.0** - Transactional email service
- **React Email 4.3.2** - Beautiful email templates

#### Utilities
- **date-fns 4.1.0** - Date formatting and manipulation
- **nanoid 5.1.6** - Unique ID generation
- **clsx & tailwind-merge** - Conditional CSS classes
- **class-variance-authority** - Component variant styling
- **sonner 2.0.7** - Toast notifications

#### Development Tools
- **Drizzle Kit 0.31.6** - Database migration tool
- **ESLint** - Code linting
- **tsx** - TypeScript execution

---

### Getting Started

#### Prerequisites

**Required:**
- Node.js 20 or higher
- A Neon Postgres database (free tier available)
- OpenAI API key (GPT-5 access required)
- Inngest account (free tier available)

**Optional (features work without these):**
- AWS S3 bucket (for image uploads)
- Upstash Redis database (for rate limiting)
- Resend API key (for emails)
- GitHub/Google OAuth credentials (for social login)

#### Installation

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Setup environment variables**

   Copy `.env-example.local` to `.env.local` and fill in your credentials:

   ```bash
   cp .env-example.local .env.local
   ```

   **Required environment variables:**
   ```env
   # Database
   DATABASE_URL=postgresql://user:pass@host/db  # Neon Postgres connection string

   # Auth
   BETTER_AUTH_SECRET=your-secret-here  # Generate: openssl rand -base64 32
   NEXT_PUBLIC_APP_URL=http://localhost:3000

   # AI
   OPENAI_API_KEY=sk-...  # Your OpenAI API key (GPT-5 access)

   # Background Jobs
   INNGEST_EVENT_KEY=your-event-key  # From Inngest dashboard
   INNGEST_SIGNING_KEY=your-signing-key  # From Inngest dashboard
   ```

   **Optional environment variables:**
   ```env
   # Image Uploads (optional - feature disabled if not set)
   AWS_REGION=us-east-1
   AWS_ACCESS_KEY_ID=your-access-key
   AWS_SECRET_ACCESS_KEY=your-secret-key
   AWS_S3_BUCKET_NAME=your-bucket-name

   # Rate Limiting (optional - rate limiting skipped if not set)
   UPSTASH_REDIS_REST_URL=https://...
   UPSTASH_REDIS_REST_TOKEN=...

   # Emails (optional - emails won't send but app runs)
   RESEND_API_KEY=re_...

   # OAuth (optional - email/password still works)
   GITHUB_CLIENT_ID=your-github-client-id
   GITHUB_CLIENT_SECRET=your-github-client-secret
   GOOGLE_CLIENT_ID=your-google-client-id
   GOOGLE_CLIENT_SECRET=your-google-client-secret
   ```

3. **Setup database**

   Generate and run database migrations:

   ```bash
   npm run db:generate
   npm run db:push
   ```

4. **Run development server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **Setup Inngest Dev Server** (recommended for local development)

   In a separate terminal:

   ```bash
   npx inngest-cli@latest dev
   ```

   This will start the Inngest dev server at [http://localhost:8288](http://localhost:8288) where you can view function execution logs and trigger events manually.

---

### Project Structure

```
project/
├── app/                          # Next.js 16 App Router
│   ├── api/                      # API Routes (RESTful endpoints)
│   │   ├── auth/                 # Better Auth API endpoints
│   │   ├── inngest/              # Inngest webhook handler
│   │   ├── questions/            # Question CRUD + voting
│   │   │   ├── [id]/            # Get single question
│   │   │   ├── vote/            # Vote on question
│   │   │   └── route.ts         # List questions, create question
│   │   ├── answers/              # Answer CRUD + voting + accept
│   │   │   ├── [id]/            # Delete answer, accept answer
│   │   │   ├── vote/            # Vote on answer
│   │   │   └── route.ts         # Create answer
│   │   ├── users/                # User profile endpoints
│   │   │   └── [id]/            # Get user profile
│   │   ├── search/               # Full-text search
│   │   │   └── route.ts         # Search questions & answers
│   │   └── upload/               # S3 presigned URL generation
│   │       ├── presigned-url/    # Generate upload URLs
│   │       └── image-url/        # Get image URLs for Inngest
│   ├── auth/                     # Auth pages
│   │   ├── signin/               # Sign in page
│   │   │   └── page.tsx
│   │   └── signup/               # Sign up page
│   │       └── page.tsx
│   ├── questions/                # Question pages
│   │   ├── [id]/                 # Question detail (dynamic route)
│   │   │   └── page.tsx
│   │   ├── ask/                  # Create question form
│   │   │   └── page.tsx
│   │   └── page.tsx              # Questions list with pagination
│   ├── search/                   # Search functionality
│   │   └── page.tsx              # Search results page
│   ├── users/                    # User profiles
│   │   └── [id]/                 # User profile page (dynamic route)
│   │       └── page.tsx
│   ├── settings/                 # User settings
│   │   └── page.tsx              # Edit profile page
│   ├── actions/                  # Server actions (future use)
│   ├── layout.tsx                # Root layout with header
│   └── page.tsx                  # Home page (hero + features)
│
├── components/                   # React components
│   ├── ui/                       # shadcn/ui components (14 components)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── badge.tsx
│   │   ├── card.tsx
│   │   ├── markdown-editor.tsx   # Custom markdown editor
│   │   ├── pagination.tsx
│   │   ├── alert-dialog.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── avatar.tsx
│   │   ├── tabs.tsx
│   │   ├── label.tsx
│   │   ├── textarea.tsx
│   │   ├── dialog.tsx
│   │   └── skeleton.tsx
│   ├── header.tsx                # Dynamic header with auth state
│   ├── vote-buttons.tsx          # Upvote/downvote component
│   ├── image-upload.tsx          # S3 image upload (max 4 images)
│   ├── image-display.tsx         # Display uploaded images
│   ├── image-modal.tsx           # Full-screen image viewer
│   ├── profile-edit-form.tsx     # Edit user profile
│   └── providers.tsx             # React Query provider
│
├── inngest/                      # Background job functions
│   ├── client.ts                 # Inngest client configuration
│   └── functions/
│       ├── generate-ai-answer.ts          # GPT-5 + vision + tagging
│       ├── send-welcome-email.ts          # Welcome email
│       ├── send-answer-notification.ts    # Answer alert emails
│       └── send-answer-accepted-notification.ts  # Accepted answer email
│
├── lib/                          # Core utilities
│   ├── auth/                     # 🔐 Authentication (Better Auth)
│   │   ├── config.ts             # Better Auth server config
│   │   ├── client.ts             # Better Auth React hooks
│   │   └── middleware.ts         # Auth middleware for protected routes
│   ├── db/                       # 🗄️ Database layer (Drizzle ORM)
│   │   ├── index.ts              # Neon Postgres connection
│   │   └── schema.ts             # Database schema & types
│   ├── services/                 # 🔧 External service configurations
│   │   ├── inngest.ts            # Inngest client (background jobs)
│   │   ├── s3.ts                 # AWS S3 client (image uploads)
│   │   └── rate-limit.ts         # Upstash Redis rate limiter
│   ├── api/                      # 🌐 API client & types
│   │   └── index.ts              # API client, query keys, Zod types
│   ├── queries/                  # 📥 TanStack Query (GET operations)
│   │   ├── questions.ts          # useQuestions, useQuestion
│   │   ├── users.ts              # useUser
│   │   ├── search.ts             # useSearch
│   │   └── images.ts             # useImageUrl, useImageUrls
│   ├── mutations/                # 📤 TanStack Mutations (POST/PUT/DELETE)
│   │   ├── questions.ts          # useCreateQuestion
│   │   ├── answers.ts            # useCreateAnswer, useAcceptAnswer, useDeleteAnswer
│   │   ├── votes.ts              # useVote
│   │   └── images.ts             # useUploadImage
│   ├── validations/              # ✅ Zod validation schemas
│   │   ├── auth.ts               # Auth validation
│   │   ├── profile.ts            # Profile validation
│   │   └── question.ts           # Question/answer validation
│   └── utils.ts                  # 🛠️ Helper functions (cn, etc.)
│
├── drizzle/                      # Database migrations
├── public/                       # Static assets
├── .env.local                    # Environment variables (not in git)
├── .env-example.local            # Environment template
├── package.json                  # Dependencies
├── next.config.ts                # Next.js configuration
├── drizzle.config.ts             # Drizzle ORM configuration
├── tsconfig.json                 # TypeScript configuration
├── tailwind.config.ts            # Tailwind configuration
├── components.json               # shadcn/ui configuration
└── proxy.ts                      # Next.js 16 proxy for rate limiting
```

---

### Available Scripts

- `npm run dev` - Start development server (port 3000)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:generate` - Generate database migrations
- `npm run db:push` - Push schema to database (no migrations)
- `npm run db:studio` - Open Drizzle Studio (database GUI)

---

### Centralized Query Management

This project uses a **centralized query management system** built with TanStack Query (React Query). All API calls are organized in dedicated folders rather than scattered throughout components.

#### Structure

- **`lib/api/index.ts`** - API client, Zod schemas, and type definitions with runtime validation
- **`lib/queries/`** - Read operations (GET requests) with TanStack Query hooks
- **`lib/mutations/`** - Write operations (POST, PUT, DELETE) with TanStack Mutation hooks

#### Benefits

- **Type Safety**: Zod schemas provide runtime validation and TypeScript types
- **Code Organization**: All API logic centralized in dedicated folders
- **Caching**: Automatic caching, background refetching, and stale-while-revalidate
- **Optimistic Updates**: Better UX with immediate UI updates (voting, etc.)
- **Error Handling**: Centralized error handling with retry logic
- **Performance**: Query deduplication and intelligent cache management
- **DevTools**: React Query DevTools for debugging

#### Usage Examples

```tsx
// Using queries (GET operations)
import { useQuestions, useQuestion } from "@/lib/queries/questions";
import { useUser } from "@/lib/queries/users";

function QuestionsPage() {
  const { data: questions, isLoading } = useQuestions(1); // Page 1
  const { data: user } = useUser(userId);

  // Data is automatically cached and revalidated
}

// Using mutations (POST/PUT/DELETE operations)
import { useCreateQuestion } from "@/lib/mutations/questions";
import { useVote } from "@/lib/mutations/votes";

function AskQuestionPage() {
  const createQuestion = useCreateQuestion();

  const handleSubmit = (data) => {
    createQuestion.mutate(data, {
      onSuccess: () => {
        // Automatic navigation and cache invalidation
        router.push(`/questions/${response.id}`);
      },
    });
  };
}

// Optimistic updates (immediate UI feedback)
function VoteButtons({ questionId, initialVotes }) {
  const vote = useVote();

  const handleVote = (voteType) => {
    vote.mutate({ itemId: questionId, voteType });
    // UI updates immediately, rolls back on error
  };
}
```

---

## 🚀 Technical Deep Dive

### Database Schema Overview

The database is designed with separation of concerns and proper indexing:

**Core Tables:**
- `users` - Authentication data (Better Auth)
- `userProfile` - Extended user info (name, bio, reputation, etc.)
- `questions` - Questions with images array, votes, view count
- `answers` - Answers with soft delete, votes, accepted flag
- `tags` - Tag definitions with usage count
- `questionTags` - Junction table (many-to-many)
- `questionVotes` & `answerVotes` - Voting records with unique constraints

**Key Features:**
- Array columns for images (PostgreSQL arrays)
- Indexes on foreign keys and frequently queried fields
- Soft deletes with `isDeleted` flag
- Timestamps for auditing (`createdAt`, `updatedAt`)
- Drizzle relations for type-safe joins

**View Schema:**
```bash
npm run db:studio  # Opens Drizzle Studio in browser
```

---

### How TanStack Query Works

**Key Concepts:**
- **Hierarchical Query Keys** - Organized cache keys for precise invalidation (`lib/api/index.ts`)
- **Automatic Caching** - Data cached with configurable staleness (30s default)
- **Optimistic Updates** - UI updates immediately, rolls back on error
- **Cache Invalidation** - Smart refetching when data changes

See "Key Code Patterns" section above for detailed examples.

---

### How Inngest Works

**Event-Driven Background Jobs:**
1. API route sends event → `inngest.send({ name: "question.created", data: { questionId } })`
2. Inngest receives event, queues function with retry logic and concurrency limits
3. Function executes in steps (each step tracked, resumable on failure)
4. Generate AI answer → Tag question → Send notifications

**Key Features:**
- **Step-based execution** - Each step cached and retryable independently
- **Concurrency control** - Limit concurrent executions (e.g., max 5 AI requests)
- **Auto-retry** - Failed functions retry automatically (3x default)
- **Monitoring** - View logs and replay events in dashboard

**Local Development:**
```bash
npx inngest-cli@latest dev  # Opens UI at http://localhost:8288
```

See "Key Code Patterns" section above for detailed function structure.

---

### How Image Upload Works (S3 Presigned URLs)

**Secure Direct Upload Flow:**
1. Client requests presigned URL from server (`POST /api/upload/presigned-url`)
2. Server generates temporary S3 upload URL (expires in 5 minutes)
3. Browser uploads file directly to S3 (never touches our server)
4. Client sends S3 key to API, stored in database `images` array

**Benefits:** Faster uploads, saves bandwidth, secure (URLs expire quickly, server validates file type/size)

---

### How Rate Limiting Works

**Upstash Redis Sliding Window:**
- 10 requests per 10 seconds per IP address
- Implemented in Next.js proxy layer (`proxy.ts`)
- Returns 429 status when limit exceeded
- Analytics enabled for monitoring

---

### Adding a New Feature (Step-by-Step)

**Example: Add "Follow User" feature**

1. **Update Database Schema** (`lib/db/schema.ts`):
```typescript
export const follows = pgTable("follows", {
  id: text("id").primaryKey(),
  followerId: text("follower_id").notNull(),
  followingId: text("following_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
```

2. **Generate Migration**:
```bash
npm run db:generate
npm run db:push
```

3. **Create API Route** (`app/api/users/[id]/follow/route.ts`):
```typescript
import { db } from "@/lib/db";
import { follows } from "@/lib/schema";

export async function POST(request: Request) {
  const { followingId } = await request.json();
  const session = await auth.api.getSession({ headers: request.headers });

  await db.insert(follows).values({
    id: nanoid(),
    followerId: session.user.id,
    followingId,
  });

  return Response.json({ success: true });
}
```

4. **Create Mutation Hook** (`lib/mutations/follows.ts`):
```typescript
export const useFollowUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userId: string) =>
      fetch(`/api/users/${userId}/follow`, {
        method: "POST",
        body: JSON.stringify({ followingId: userId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: userKeys.all });
    },
  });
};
```

5. **Use in Component** (`components/follow-button.tsx`):
```typescript
"use client";
import { useFollowUser } from "@/lib/mutations/follows";

export function FollowButton({ userId }) {
  const followUser = useFollowUser();

  return (
    <button onClick={() => followUser.mutate(userId)}>
      Follow
    </button>
  );
}
```

---

## ⚠️ Troubleshooting & Common Pitfalls

### Inngest Local Development

**Problem:** Events not triggering locally
```
Function not executing when sending events
```

**Solution:**
1. Ensure Inngest dev server is running: `npx inngest-cli@latest dev`
2. Check that `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` are set in `.env.local`
3. Verify webhook is registered: Visit http://localhost:8288 and check "Apps" tab
4. Manually trigger events in Inngest UI to test functions
5. Check console logs in both Next.js terminal and Inngest terminal

**Tip:** Use Inngest UI to view function execution logs and retry failed runs

---

### S3 CORS Configuration

**Problem:** Image uploads fail with CORS error
```
Access to fetch at 'https://s3.amazonaws.com/...' from origin 'http://localhost:3000' has been blocked by CORS policy
```

**Solution:**
Add CORS policy to your S3 bucket:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "POST", "GET"],
    "AllowedOrigins": ["http://localhost:3000", "https://your-domain.com"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

**Steps:**
1. Go to AWS S3 Console → Your Bucket → Permissions → CORS
2. Paste the above configuration
3. Replace `https://your-domain.com` with your production URL

---

### OAuth Redirect URI Configuration

**Problem:** OAuth login fails with redirect URI mismatch
```
Error: redirect_uri_mismatch
```

**Solution:**

**GitHub OAuth:**
1. Go to GitHub Settings → Developer Settings → OAuth Apps → Your App
2. Set Authorization callback URL to: `http://localhost:3000/api/auth/callback/github`
3. For production: `https://your-domain.com/api/auth/callback/github`

**Google OAuth:**
1. Go to Google Cloud Console → APIs & Services → Credentials → Your OAuth Client
2. Add Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
3. For production: `https://your-domain.com/api/auth/callback/google`

---

### Database Connection Issues

**Problem:** Database connection timeout or SSL errors
```
Error: connection timeout
```

**Solution:**
1. **Check Neon connection string format**: Should include `?sslmode=require`
   ```
   postgresql://user:pass@host/db?sslmode=require
   ```
2. **Enable pooling** (recommended for serverless):
   ```
   postgresql://user:pass@host/db?sslmode=require&connection_limit=10
   ```
3. **Check IP allowlist** in Neon dashboard (if enabled)
4. **Test connection**: Run `npm run db:studio` to verify database access

---

### Email Not Sending (Resend)

**Problem:** Emails not being sent
```
No emails arriving, no errors in console
```

**Solution:**
1. **Check environment variable**: Verify `RESEND_API_KEY` is set correctly
2. **Verify domain**: In Resend dashboard, check if domain is verified
3. **Check sender email**: Must be from verified domain (e.g., `noreply@your-domain.com`)
4. **Check Inngest logs**: Emails are sent via background jobs, check function execution logs
5. **Development mode**: Resend sends test emails to registered email only

**Note:** App runs without Resend - emails just won't send

---

### Rate Limiting Not Working

**Problem:** Rate limiting not being applied
```
Requests not being rate limited
```

**Solution:**
1. **Check environment variables**: `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` must be set
2. **Verify Redis connection**: Test in Upstash dashboard
3. **Check proxy setup**: Rate limiting is in `proxy.ts`, ensure it's properly configured
4. **Development note**: If variables not set, rate limiting is silently skipped (by design)

---

### Common Student Mistakes

#### 1. Forgetting to run database migrations
```bash
# Always run after pulling new code or changing schema
npm run db:generate
npm run db:push
```

#### 2. Not wrapping client components with "use client"
```typescript
// components/vote-buttons.tsx
"use client";  // ← Don't forget this for interactive components!

import { useVote } from "@/lib/mutations/votes";

export function VoteButtons() {
  // ...
}
```

#### 3. Mutating state directly in optimistic updates
```typescript
// ❌ Wrong - mutates original object
onMutate: async (variables) => {
  const previous = queryClient.getQueryData(key);
  previous.votes++; // Don't mutate!
  return { previous };
};

// ✅ Correct - create new object
onMutate: async (variables) => {
  const previous = queryClient.getQueryData(key);
  queryClient.setQueryData(key, { ...previous, votes: previous.votes + 1 });
  return { previous };
};
```

#### 4. Not handling loading and error states
```typescript
// Always handle all states
const { data, isLoading, isError, error } = useQuestions(page);

if (isLoading) return <Skeleton />;
if (isError) return <div>Error: {error.message}</div>;
if (!data) return <div>No data</div>;

return <QuestionList questions={data} />;
```

#### 5. Forgetting to invalidate queries after mutations
```typescript
// Always invalidate to sync UI with server
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: questionKeys.all });
  // UI will refetch and show updated data
},
```

---

## 📝 Feature Implementation Status

- [x] User authentication (email/password + OAuth - GitHub & Google)
- [x] Complete auth pages (sign in, sign up, sign out)
- [x] Ask questions with Markdown support
- [x] Image upload (up to 4 images per question using AWS S3)
- [x] GPT-5 Vision (AI analyzes images in questions)
- [x] View questions list with pagination
- [x] View question details with all answers
- [x] AI answer generation with GPT-5 (background processing)
- [x] Auto-tagging with GPT-5 Mini
- [x] Email notifications (welcome, answer alerts, accepted answer)
- [x] Voting system (upvote/downvote questions & answers)
- [x] Reputation system (earn points from votes)
- [x] User profiles (view user stats, questions, answers)
- [x] Profile editing (name, bio, location, etc.)
- [x] Dynamic header (shows logged-in user)
- [x] Full-text search (PostgreSQL to_tsvector search)
- [x] Rate limiting (Upstash Redis-based protection)
- [x] Centralized query management (TanStack Query with Zod validation)
- [x] Accept answers (mark best answer, +15 reputation, email notification)
- [x] Delete answers (soft delete with confirmation)
- [ ] Daily digest emails
- [ ] Comments on answers
- [ ] Question editing
- [ ] User following
- [ ] Tag pages with filtering

---

## 🚀 Deploy on Vercel

### Deployment Steps

1. **Push code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/devquery.git
   git push -u origin main
   ```

2. **Import project in Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository
   - Select "Next.js" as framework

3. **Add environment variables**
   In Vercel project settings, add all variables from `.env.local`:
   - `DATABASE_URL`
   - `BETTER_AUTH_SECRET`
   - `NEXT_PUBLIC_APP_URL` (set to your Vercel URL)
   - `OPENAI_API_KEY`
   - `INNGEST_EVENT_KEY`
   - `INNGEST_SIGNING_KEY`
   - All optional variables (S3, Redis, Resend, OAuth)

4. **Install Inngest integration**
   - In Vercel dashboard, go to Integrations
   - Search for "Inngest"
   - Install and connect to your project
   - This automatically configures Inngest to receive events from your app

5. **Deploy!**
   - Click "Deploy"
   - Wait for build to complete
   - Visit your app at `https://your-project.vercel.app`

### Production Checklist

- [ ] Update `NEXT_PUBLIC_APP_URL` to production URL
- [ ] Update OAuth redirect URIs to production URL
- [ ] Configure custom domain (optional)
- [ ] Set up S3 bucket CORS for production domain
- [ ] Monitor Inngest dashboard for function errors
- [ ] Set up error tracking (Sentry recommended)
- [ ] Enable Vercel Analytics for performance monitoring
- [ ] Test all features in production environment
- [ ] Check rate limiting is working (Upstash Analytics)

---

## 🎓 Learning Resources

### Official Documentation

- [Next.js](https://nextjs.org/docs)
- [TanStack Query](https://tanstack.com/query/latest)
- [Drizzle ORM](https://orm.drizzle.team/docs/overview)
- [Better Auth](https://better-auth.com)
- [Inngest](https://www.inngest.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [shadcn/ui](https://ui.shadcn.com)

---

## 💡 Student Exercise Ideas

**Beginner:** Bio character counter, sort dropdown, loading skeletons, toast notifications
**Intermediate:** Comments on answers, question editing, user following, tag pages, profile tabs
**Advanced:** Daily digest emails (Inngest cron), search filters, admin dashboard, leaderboard, badges, code playground

---

**Technologies:** Next.js 16, React 19, Tailwind v4, TanStack Query, Drizzle ORM, Better Auth, Inngest, OpenAI GPT-5, AWS S3, Neon Postgres.

---

**Happy Learning! 🚀**
