CREATE TABLE "symptoms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"severity" integer,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "symptoms_severity_check" CHECK ("symptoms"."severity" BETWEEN 1 AND 10),
	CONSTRAINT "symptoms_end_check" CHECK ("symptoms"."ended_at" IS NULL OR "symptoms"."ended_at" >= "symptoms"."started_at")
);
--> statement-breakpoint
ALTER TABLE "symptoms" ADD CONSTRAINT "symptoms_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "symptoms_user_id_started_at_index" ON "symptoms" USING btree ("user_id","started_at" DESC NULLS LAST);