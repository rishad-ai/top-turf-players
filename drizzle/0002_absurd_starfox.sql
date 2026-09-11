ALTER TABLE "players" ADD COLUMN "mobile_number" text;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "last_login_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_mobile_number_unique" UNIQUE("mobile_number");