CREATE TABLE "foods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"normalized_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "foods_user_id_normalized_name_unique" UNIQUE("user_id","normalized_name"),
	CONSTRAINT "foods_id_user_id_unique" UNIQUE("id","user_id")
);
--> statement-breakpoint
CREATE TABLE "meal_foods" (
	"meal_id" uuid NOT NULL,
	"food_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"food_name_snapshot" text NOT NULL,
	CONSTRAINT "meal_foods_meal_id_food_id_pk" PRIMARY KEY("meal_id","food_id")
);
--> statement-breakpoint
CREATE TABLE "meals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"note" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "meals_id_user_id_unique" UNIQUE("id","user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"google_sub" text NOT NULL,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_google_sub_unique" UNIQUE("google_sub")
);
--> statement-breakpoint
ALTER TABLE "foods" ADD CONSTRAINT "foods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_foods" ADD CONSTRAINT "meal_foods_meal_id_user_id_meals_id_user_id_fk" FOREIGN KEY ("meal_id","user_id") REFERENCES "public"."meals"("id","user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_foods" ADD CONSTRAINT "meal_foods_food_id_user_id_foods_id_user_id_fk" FOREIGN KEY ("food_id","user_id") REFERENCES "public"."foods"("id","user_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meals" ADD CONSTRAINT "meals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "meals_user_id_occurred_at_index" ON "meals" USING btree ("user_id","occurred_at" DESC NULLS LAST);