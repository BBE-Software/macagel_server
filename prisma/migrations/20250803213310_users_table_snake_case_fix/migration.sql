/*
  Warnings:

  - You are about to drop the column `currentLatitude` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `currentLongitude` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."users" DROP COLUMN "currentLatitude",
DROP COLUMN "currentLongitude",
ADD COLUMN     "current_latitude" REAL,
ADD COLUMN     "current_longitude" REAL;
