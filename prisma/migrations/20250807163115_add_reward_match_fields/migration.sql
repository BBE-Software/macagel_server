-- AlterTable
ALTER TABLE "public"."match_lobbies" ADD COLUMN     "is_reward_match" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reward_description" TEXT;
