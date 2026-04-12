ALTER TABLE "invite" ADD COLUMN "infinity_max_uses" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "invite" ADD COLUMN "emails" text[];