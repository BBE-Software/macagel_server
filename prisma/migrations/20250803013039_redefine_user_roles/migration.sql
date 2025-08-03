/*
  Warnings:

  - The primary key for the `user_roles` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The `id` column on the `user_roles` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[name]` on the table `user_roles` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `description` to the `user_roles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `label` to the `user_roles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `user_roles` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."user_roles" DROP CONSTRAINT "user_roles_pkey",
ADD COLUMN     "description" TEXT NOT NULL,
ADD COLUMN     "label" TEXT NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL,
DROP COLUMN "id",
ADD COLUMN     "id" SERIAL NOT NULL,
ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_name_key" ON "public"."user_roles"("name");
