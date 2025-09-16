CREATE TYPE "public"."notification_type" AS ENUM('pickup_request', 'pickup_accepted', 'pickup_completed', 'reward_earned', 'payment_received', 'system_update');--> statement-breakpoint
CREATE TYPE "public"."pickup_status" AS ENUM('pending', 'accepted', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."reward_type" AS ENUM('airtime', 'data', 'voucher', 'cash');--> statement-breakpoint
CREATE TYPE "public"."transaction_status" AS ENUM('pending', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('pickup_payment', 'subscription', 'commission', 'refund', 'withdrawal');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('household', 'waste_picker', 'recycling_company', 'admin', 'government');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'inactive', 'suspended', 'pending_verification');--> statement-breakpoint
CREATE TYPE "public"."waste_type" AS ENUM('plastic', 'paper', 'metal', 'glass', 'electronics', 'organic', 'mixed');--> statement-breakpoint
CREATE TABLE "analytics_data" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" timestamp NOT NULL,
	"total_pickups" integer DEFAULT 0,
	"total_waste_collected" numeric(10, 2) DEFAULT '0.00',
	"total_points_awarded" integer DEFAULT 0,
	"total_revenue" numeric(10, 2) DEFAULT '0.00',
	"active_users" integer DEFAULT 0,
	"new_registrations" integer DEFAULT 0,
	"waste_type_breakdown" jsonb DEFAULT '{}'::jsonb,
	"location_data" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "email_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"subject" varchar(500) NOT NULL,
	"html_content" text NOT NULL,
	"text_content" text,
	"variables" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "email_templates_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"data" jsonb DEFAULT '{}'::jsonb,
	"is_read" boolean DEFAULT false,
	"read_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "pickup_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_id" uuid NOT NULL,
	"waste_picker_id" uuid,
	"waste_type" "waste_type" NOT NULL,
	"estimated_weight" numeric(8, 2),
	"actual_weight" numeric(8, 2),
	"description" text,
	"images" jsonb DEFAULT '[]'::jsonb,
	"pickup_address" text NOT NULL,
	"pickup_latitude" varchar(50) NOT NULL,
	"pickup_longitude" varchar(50) NOT NULL,
	"preferred_date" timestamp,
	"preferred_time_slot" varchar(50),
	"status" "pickup_status" DEFAULT 'pending',
	"points_earned" integer DEFAULT 0,
	"rating" integer,
	"feedback" text,
	"completed_at" timestamp,
	"cancelled_at" timestamp,
	"cancellation_reason" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "recycling_company_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"company_name" varchar(255) NOT NULL,
	"registration_number" varchar(100),
	"website" varchar(255),
	"description" text,
	"accepted_waste_types" jsonb DEFAULT '[]'::jsonb,
	"processing_capacity" integer,
	"is_verified" boolean DEFAULT false,
	"verification_documents" jsonb DEFAULT '[]'::jsonb,
	"operating_hours" jsonb DEFAULT '{}'::jsonb,
	"certifications" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "reward_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"reward_id" uuid NOT NULL,
	"points_used" integer NOT NULL,
	"redemption_code" varchar(50),
	"delivery_info" jsonb DEFAULT '{}'::jsonb,
	"status" varchar(50) DEFAULT 'pending',
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"type" "reward_type" NOT NULL,
	"points_cost" integer NOT NULL,
	"value" numeric(10, 2) NOT NULL,
	"provider" varchar(100),
	"stock_quantity" integer,
	"image" text,
	"terms_and_conditions" text,
	"expiry_date" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan_name" varchar(100) NOT NULL,
	"plan_type" varchar(50) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"start_date" timestamp DEFAULT now(),
	"end_date" timestamp NOT NULL,
	"status" varchar(50) DEFAULT 'active',
	"auto_renew" boolean DEFAULT true,
	"features" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" varchar(255) NOT NULL,
	"value" text NOT NULL,
	"description" text,
	"type" varchar(50) DEFAULT 'string',
	"is_public" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "system_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"pickup_request_id" uuid,
	"type" "transaction_type" NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"points" integer DEFAULT 0,
	"status" "transaction_status" DEFAULT 'pending',
	"payment_reference" varchar(255),
	"payment_method" varchar(100),
	"description" text,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"phone" varchar(20),
	"role" "user_role" DEFAULT 'household' NOT NULL,
	"status" "user_status" DEFAULT 'pending_verification' NOT NULL,
	"is_email_verified" boolean DEFAULT false,
	"is_phone_verified" boolean DEFAULT false,
	"email_verification_token" varchar(255),
	"phone_verification_code" varchar(10),
	"password_reset_token" varchar(255),
	"password_reset_expires" timestamp,
	"address" text,
	"city" varchar(100),
	"state" varchar(100),
	"country" varchar(100) DEFAULT 'Nigeria',
	"latitude" varchar(50),
	"longitude" varchar(50),
	"avatar" text,
	"total_points" integer DEFAULT 0,
	"available_points" integer DEFAULT 0,
	"total_earnings" numeric(10, 2) DEFAULT '0.00',
	"rating" numeric(3, 2) DEFAULT '0.00',
	"total_ratings" integer DEFAULT 0,
	"last_login_at" timestamp,
	"permissions" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "waste_picker_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"vehicle_type" varchar(100),
	"vehicle_number" varchar(50),
	"license_number" varchar(50),
	"service_radius" integer DEFAULT 10,
	"specializations" jsonb DEFAULT '[]'::jsonb,
	"working_hours" jsonb DEFAULT '{}'::jsonb,
	"is_verified" boolean DEFAULT false,
	"verification_documents" jsonb DEFAULT '[]'::jsonb,
	"bank_account_name" varchar(255),
	"bank_account_number" varchar(20),
	"bank_name" varchar(100),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pickup_requests" ADD CONSTRAINT "pickup_requests_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pickup_requests" ADD CONSTRAINT "pickup_requests_waste_picker_id_users_id_fk" FOREIGN KEY ("waste_picker_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recycling_company_profiles" ADD CONSTRAINT "recycling_company_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_redemptions" ADD CONSTRAINT "reward_redemptions_reward_id_rewards_id_fk" FOREIGN KEY ("reward_id") REFERENCES "public"."rewards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_pickup_request_id_pickup_requests_id_fk" FOREIGN KEY ("pickup_request_id") REFERENCES "public"."pickup_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "waste_picker_profiles" ADD CONSTRAINT "waste_picker_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;