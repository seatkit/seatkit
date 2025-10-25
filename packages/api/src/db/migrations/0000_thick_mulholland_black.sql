CREATE TYPE "public"."reservation_category" AS ENUM('lunch', 'dinner', 'special', 'walk_in');--> statement-breakpoint
CREATE TYPE "public"."reservation_source" AS ENUM('phone', 'web', 'walk_in', 'email', 'other');--> statement-breakpoint
CREATE TYPE "public"."reservation_status" AS ENUM('pending', 'confirmed', 'seated', 'completed', 'cancelled', 'no_show');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"date" timestamp NOT NULL,
	"duration" integer NOT NULL,
	"table_ids" jsonb,
	"customer" jsonb NOT NULL,
	"party_size" integer NOT NULL,
	"category" "reservation_category" NOT NULL,
	"status" "reservation_status" DEFAULT 'pending' NOT NULL,
	"notes" text,
	"tags" jsonb,
	"created_by" varchar(255) NOT NULL,
	"source" "reservation_source",
	"confirmed_at" timestamp,
	"seated_at" timestamp,
	"completed_at" timestamp,
	"cancelled_at" timestamp,
	"cancelled_by" varchar(255),
	"cancellation_reason" text
);
