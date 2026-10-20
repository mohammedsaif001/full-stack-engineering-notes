CREATE TABLE "question_tags" (
	"question_id" integer NOT NULL,
	"tag_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "slug" text NOT NULL;--> statement-breakpoint
ALTER TABLE "question_tags" ADD CONSTRAINT "question_tags_question_id_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "question_tags" ADD CONSTRAINT "question_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "question_tags_pkey" ON "question_tags" USING btree ("question_id","tag_id");--> statement-breakpoint
CREATE INDEX "question_tags_question_idx" ON "question_tags" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "question_tags_tag_idx" ON "question_tags" USING btree ("tag_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_answer_vote" ON "answer_votes" USING btree ("answer_id","user_id");--> statement-breakpoint
CREATE INDEX "answers_question_idx" ON "answers" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "answers_author_idx" ON "answers" USING btree ("author_id");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_question_vote" ON "question_votes" USING btree ("question_id","user_id");--> statement-breakpoint
CREATE INDEX "questions_author_idx" ON "questions" USING btree ("author_id");--> statement-breakpoint
CREATE INDEX "questions_created_at_idx" ON "questions" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "questions" DROP COLUMN "tags";--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_slug_unique" UNIQUE("slug");