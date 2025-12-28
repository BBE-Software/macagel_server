-- Add performance indexes for messages, friends, and friend_requests tables
-- This will significantly improve query performance

-- Messages table indexes
CREATE INDEX "messages_conversation_id_idx" ON "public"."messages"("conversation_id");
CREATE INDEX "messages_sender_id_idx" ON "public"."messages"("sender_id");
CREATE INDEX "messages_receiver_id_idx" ON "public"."messages"("receiver_id");
CREATE INDEX "messages_created_at_idx" ON "public"."messages"("created_at" DESC);
CREATE INDEX "messages_is_read_idx" ON "public"."messages"("is_read");

-- Compound index for common query pattern: unread messages by conversation
CREATE INDEX "messages_conversation_unread_idx" ON "public"."messages"("conversation_id", "is_read", "receiver_id");

-- Compound index for message ordering in conversations
CREATE INDEX "messages_conversation_created_idx" ON "public"."messages"("conversation_id", "created_at" DESC);

-- Friend requests indexes
CREATE INDEX "friend_requests_receiver_status_idx" ON "public"."friend_requests"("receiver_id", "status");
CREATE INDEX "friend_requests_sender_status_idx" ON "public"."friend_requests"("sender_id", "status");
CREATE INDEX "friend_requests_created_at_idx" ON "public"."friend_requests"("created_at" DESC);

-- Friends table indexes (for quick lookup when checking friendship status)
CREATE INDEX "friends_user1_id_idx" ON "public"."friends"("user1_id");
CREATE INDEX "friends_user2_id_idx" ON "public"."friends"("user2_id");

-- Conversations indexes
CREATE INDEX "conversations_user1_id_idx" ON "public"."conversations"("user1_id");
CREATE INDEX "conversations_user2_id_idx" ON "public"."conversations"("user2_id");
CREATE INDEX "conversations_updated_at_idx" ON "public"."conversations"("updated_at" DESC);

-- Users table indexes for search performance
CREATE INDEX "users_name_idx" ON "public"."users"("name");
CREATE INDEX "users_surname_idx" ON "public"."users"("surname");
CREATE INDEX "users_nickname_idx" ON "public"."users"("nickname");
CREATE INDEX "users_email_idx" ON "public"."users"("email");
CREATE INDEX "users_is_active_idx" ON "public"."users"("is_active");


