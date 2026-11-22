CREATE TABLE "food_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"base_score" integer NOT NULL,
	"time_ranges" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "food_groups_id_user_id_unique" UNIQUE("id","user_id"),
	CONSTRAINT "food_groups_base_score_check" CHECK ("food_groups"."base_score" BETWEEN 1 AND 5),
	CONSTRAINT "food_groups_description_check" CHECK (char_length("food_groups"."description") <= 200),
	CONSTRAINT "food_groups_time_ranges_check" CHECK (jsonb_typeof("food_groups"."time_ranges") = 'array')
);
--> statement-breakpoint
ALTER TABLE "foods" ADD COLUMN "group_id" uuid;--> statement-breakpoint
ALTER TABLE "foods" ADD COLUMN "base_score" integer;--> statement-breakpoint
ALTER TABLE "foods" ADD COLUMN "time_ranges" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "food_groups" ADD CONSTRAINT "food_groups_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "foods" ADD CONSTRAINT "foods_group_id_user_id_food_groups_id_user_id_fk" FOREIGN KEY ("group_id","user_id") REFERENCES "public"."food_groups"("id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "foods_user_id_group_id_index" ON "foods" USING btree ("user_id","group_id");--> statement-breakpoint
ALTER TABLE "foods" ADD CONSTRAINT "foods_base_score_check" CHECK ("foods"."base_score" BETWEEN 1 AND 5);--> statement-breakpoint
ALTER TABLE "foods" ADD CONSTRAINT "foods_time_ranges_check" CHECK (jsonb_typeof("foods"."time_ranges") = 'array');--> statement-breakpoint
ALTER TABLE "foods" ADD CONSTRAINT "foods_group_rules_check" CHECK ("foods"."group_id" IS NULL OR ("foods"."base_score" IS NULL AND "foods"."time_ranges" = '[]'::jsonb));