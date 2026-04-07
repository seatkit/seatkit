CREATE TABLE IF NOT EXISTS "tables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"name" varchar(50) NOT NULL,
	"max_capacity" integer NOT NULL,
	"min_capacity" integer DEFAULT 1 NOT NULL,
	"position_x" integer,
	"position_y" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "tables_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "restaurant_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"priority_order" jsonb NOT NULL
);
