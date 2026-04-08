CREATE TYPE "public"."presence_state" AS ENUM('viewing', 'editing');--> statement-breakpoint
CREATE TABLE "session_presence" (
	"session_id" varchar(255) PRIMARY KEY NOT NULL, -- NOSONAR (plsql:VarcharUsageCheck: standard PostgreSQL syntax, not Oracle)
	"user_id" varchar(255) NOT NULL, -- NOSONAR (plsql:VarcharUsageCheck: standard PostgreSQL syntax, not Oracle)
	"current_reservation_id" uuid,
	"presence_state" "presence_state" DEFAULT 'viewing' NOT NULL,
	"last_heartbeat_at" timestamp with time zone DEFAULT now() NOT NULL
);
