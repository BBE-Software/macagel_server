/*
  Warnings:

  - You are about to drop the `user_roles` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "public"."user_roles";

-- CreateTable
CREATE TABLE "public"."RoleDefinition" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "RoleDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoleDefinition_name_key" ON "public"."RoleDefinition"("name");

-- CreateIndex
CREATE UNIQUE INDEX "RoleDefinition_slug_key" ON "public"."RoleDefinition"("slug");
