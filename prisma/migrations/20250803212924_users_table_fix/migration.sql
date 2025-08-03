/*
  Warnings:

  - You are about to drop the column `showGender` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `showHeight` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `showWeight` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "showGender",
DROP COLUMN "showHeight",
DROP COLUMN "showWeight",
ADD COLUMN     "show_gender" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "show_height" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "show_weight" BOOLEAN NOT NULL DEFAULT true;
