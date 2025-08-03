/*
  Warnings:

  - You are about to drop the column `slug` on the `user_roles` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."user_roles_slug_key";

-- AlterTable
ALTER TABLE "public"."user_roles" DROP COLUMN "slug";
