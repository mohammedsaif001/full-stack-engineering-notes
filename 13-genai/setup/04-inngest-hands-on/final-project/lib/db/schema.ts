import { relations } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ============================================
// BETTER AUTH TABLES (Auto-generated schema)
// ============================================

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => new Date())
    .notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => new Date())
    .notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// ============================================
// APPLICATION TABLES
// ============================================

// User Profile Extension
export const userProfile = pgTable("user_profile", {
  id: serial("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" })
    .unique(),
  username: text("username").notNull().unique(),
  bio: text("bio"),
  location: text("location"),
  website: text("website"),
  githubHandle: text("github_handle"),
  reputation: integer("reputation").default(0).notNull(),
  questionsCount: integer("questions_count").default(0).notNull(),
  answersCount: integer("answers_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Questions
export const questions = pgTable(
  "questions",
  {
    id: serial("id").primaryKey(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    authorId: text("author_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    images: jsonb("images").$type<string[]>().default([]).notNull(),
    views: integer("views").default(0).notNull(),
    votes: integer("votes").default(0).notNull(),
    aiAnswerGenerated: boolean("ai_answer_generated").default(false).notNull(),
    acceptedAnswerId: integer("accepted_answer_id"),
    isDeleted: boolean("is_deleted").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    authorIdx: index("questions_author_idx").on(table.authorId),
    createdAtIdx: index("questions_created_at_idx").on(table.createdAt),
  })
);

// Answers
export const answers = pgTable(
  "answers",
  {
    id: serial("id").primaryKey(),
    questionId: integer("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    images: jsonb("images").$type<string[]>().default([]).notNull(),
    authorId: text("author_id").references(() => user.id, {
      onDelete: "set null",
    }),
    isAiGenerated: boolean("is_ai_generated").default(false).notNull(),
    votes: integer("votes").default(0).notNull(),
    isAccepted: boolean("is_accepted").default(false).notNull(),
    isDeleted: boolean("is_deleted").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => ({
    questionIdx: index("answers_question_idx").on(table.questionId),
    authorIdx: index("answers_author_idx").on(table.authorId),
  })
);

// Tags
export const tags = pgTable("tags", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  usageCount: integer("usage_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Question Tags Junction Table
export const questionTags = pgTable(
  "question_tags",
  {
    questionId: integer("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    tagId: integer("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    pk: uniqueIndex("question_tags_pkey").on(table.questionId, table.tagId),
    questionIdx: index("question_tags_question_idx").on(table.questionId),
    tagIdx: index("question_tags_tag_idx").on(table.tagId),
  })
);

// Votes
export const questionVoteEnum = pgEnum("vote_type", ["upvote", "downvote"]);

export const questionVotes = pgTable(
  "question_votes",
  {
    id: serial("id").primaryKey(),
    questionId: integer("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    voteType: questionVoteEnum("vote_type").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueVote: uniqueIndex("unique_question_vote").on(
      table.questionId,
      table.userId
    ),
  })
);

export const answerVotes = pgTable(
  "answer_votes",
  {
    id: serial("id").primaryKey(),
    answerId: integer("answer_id")
      .notNull()
      .references(() => answers.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    voteType: questionVoteEnum("vote_type").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    uniqueVote: uniqueIndex("unique_answer_vote").on(
      table.answerId,
      table.userId
    ),
  })
);

// ============================================
// RELATIONS
// ============================================

export const userRelations = relations(user, ({ one, many }) => ({
  profile: one(userProfile),
  questions: many(questions),
  answers: many(answers),
  questionVotes: many(questionVotes),
  answerVotes: many(answerVotes),
}));

export const userProfileRelations = relations(userProfile, ({ one }) => ({
  user: one(user, {
    fields: [userProfile.userId],
    references: [user.id],
  }),
}));

export const questionRelations = relations(questions, ({ one, many }) => ({
  author: one(user, {
    fields: [questions.authorId],
    references: [user.id],
  }),
  answers: many(answers),
  votes: many(questionVotes),
  questionTags: many(questionTags),
  acceptedAnswer: one(answers, {
    fields: [questions.acceptedAnswerId],
    references: [answers.id],
  }),
}));

export const answerRelations = relations(answers, ({ one, many }) => ({
  question: one(questions, {
    fields: [answers.questionId],
    references: [questions.id],
  }),
  author: one(user, {
    fields: [answers.authorId],
    references: [user.id],
  }),
  votes: many(answerVotes),
}));

export const questionVoteRelations = relations(questionVotes, ({ one }) => ({
  question: one(questions, {
    fields: [questionVotes.questionId],
    references: [questions.id],
  }),
  user: one(user, {
    fields: [questionVotes.userId],
    references: [user.id],
  }),
}));

export const answerVoteRelations = relations(answerVotes, ({ one }) => ({
  answer: one(answers, {
    fields: [answerVotes.answerId],
    references: [answers.id],
  }),
  user: one(user, {
    fields: [answerVotes.userId],
    references: [user.id],
  }),
}));

export const tagRelations = relations(tags, ({ many }) => ({
  questionTags: many(questionTags),
}));

export const questionTagRelations = relations(questionTags, ({ one }) => ({
  question: one(questions, {
    fields: [questionTags.questionId],
    references: [questions.id],
  }),
  tag: one(tags, {
    fields: [questionTags.tagId],
    references: [tags.id],
  }),
}));
