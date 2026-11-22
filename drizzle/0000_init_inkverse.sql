CREATE TABLE "bookmarks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"manhwa_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chapters" (
	"id" serial PRIMARY KEY NOT NULL,
	"manhwa_id" integer NOT NULL,
	"number" integer NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"pages" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chapters_number_check" CHECK ("chapters"."number" >= 0)
);
--> statement-breakpoint
CREATE TABLE "manhwa" (
	"id" serial PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"alternative_titles" text[] DEFAULT '{}'::text[] NOT NULL,
	"synopsis" text DEFAULT '' NOT NULL,
	"authors" text[] DEFAULT '{}'::text[] NOT NULL,
	"artists" text[] DEFAULT '{}'::text[] NOT NULL,
	"genres" text[] DEFAULT '{}'::text[] NOT NULL,
	"status" text DEFAULT 'ongoing' NOT NULL,
	"cover_url" text,
	"is_featured" boolean DEFAULT false NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"weekly_views" integer DEFAULT 0 NOT NULL,
	"last_chapter_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "manhwa_status_check" CHECK ("manhwa"."status" in ('ongoing', 'completed', 'hiatus'))
);
--> statement-breakpoint
CREATE TABLE "reading_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"manhwa_id" integer NOT NULL,
	"chapter_id" integer NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"read_count" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_read_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reading_progress" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"manhwa_id" integer NOT NULL,
	"chapter_id" integer NOT NULL,
	"scroll_position" real DEFAULT 0 NOT NULL,
	"last_read_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reading_progress_scroll_check" CHECK ("reading_progress"."scroll_position" >= 0 and "reading_progress"."scroll_position" <= 1)
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"user_agent" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" text DEFAULT 'user' NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"avatar_url" text,
	"reset_token_hash" text,
	"reset_token_expires_at" timestamp with time zone,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_role_check" CHECK ("users"."role" in ('user', 'admin')),
	CONSTRAINT "users_status_check" CHECK ("users"."status" in ('active', 'suspended'))
);
--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookmarks" ADD CONSTRAINT "bookmarks_manhwa_id_manhwa_id_fk" FOREIGN KEY ("manhwa_id") REFERENCES "public"."manhwa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_manhwa_id_manhwa_id_fk" FOREIGN KEY ("manhwa_id") REFERENCES "public"."manhwa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_history" ADD CONSTRAINT "reading_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_history" ADD CONSTRAINT "reading_history_manhwa_id_manhwa_id_fk" FOREIGN KEY ("manhwa_id") REFERENCES "public"."manhwa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_history" ADD CONSTRAINT "reading_history_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_manhwa_id_manhwa_id_fk" FOREIGN KEY ("manhwa_id") REFERENCES "public"."manhwa"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reading_progress" ADD CONSTRAINT "reading_progress_chapter_id_chapters_id_fk" FOREIGN KEY ("chapter_id") REFERENCES "public"."chapters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bookmarks_user_manhwa_uidx" ON "bookmarks" USING btree ("user_id","manhwa_id");--> statement-breakpoint
CREATE INDEX "bookmarks_manhwa_idx" ON "bookmarks" USING btree ("manhwa_id");--> statement-breakpoint
CREATE UNIQUE INDEX "chapters_manhwa_number_uidx" ON "chapters" USING btree ("manhwa_id","number");--> statement-breakpoint
CREATE INDEX "chapters_created_idx" ON "chapters" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "manhwa_slug_uidx" ON "manhwa" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "manhwa_title_idx" ON "manhwa" USING btree ("title");--> statement-breakpoint
CREATE INDEX "manhwa_views_idx" ON "manhwa" USING btree ("views");--> statement-breakpoint
CREATE INDEX "manhwa_weekly_views_idx" ON "manhwa" USING btree ("weekly_views");--> statement-breakpoint
CREATE INDEX "manhwa_status_idx" ON "manhwa" USING btree ("status");--> statement-breakpoint
CREATE INDEX "manhwa_last_chapter_idx" ON "manhwa" USING btree ("last_chapter_at");--> statement-breakpoint
CREATE INDEX "manhwa_created_idx" ON "manhwa" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "manhwa_featured_idx" ON "manhwa" USING btree ("is_featured");--> statement-breakpoint
CREATE INDEX "manhwa_genres_gin_idx" ON "manhwa" USING gin ("genres");--> statement-breakpoint
CREATE UNIQUE INDEX "reading_history_user_chapter_uidx" ON "reading_history" USING btree ("user_id","chapter_id");--> statement-breakpoint
CREATE INDEX "reading_history_user_last_read_idx" ON "reading_history" USING btree ("user_id","last_read_at");--> statement-breakpoint
CREATE INDEX "reading_history_user_manhwa_idx" ON "reading_history" USING btree ("user_id","manhwa_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reading_progress_user_manhwa_uidx" ON "reading_progress" USING btree ("user_id","manhwa_id");--> statement-breakpoint
CREATE INDEX "reading_progress_user_last_read_idx" ON "reading_progress" USING btree ("user_id","last_read_at");--> statement-breakpoint
CREATE INDEX "reading_progress_chapter_idx" ON "reading_progress" USING btree ("chapter_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_lower_uidx" ON "users" USING btree (lower("username"));--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uidx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_role_idx" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX "users_reset_token_idx" ON "users" USING btree ("reset_token_hash");