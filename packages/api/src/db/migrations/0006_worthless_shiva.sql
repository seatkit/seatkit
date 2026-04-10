CREATE TYPE "public"."acceptance_state" AS ENUM('toConfirm', 'confirmed');--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "is_deleted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "acceptance_state" "acceptance_state" DEFAULT 'toConfirm' NOT NULL;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "is_large_group" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "preferred_language" varchar(50);--> statement-breakpoint
ALTER TABLE "reservations" ADD COLUMN "emoji" varchar(10);