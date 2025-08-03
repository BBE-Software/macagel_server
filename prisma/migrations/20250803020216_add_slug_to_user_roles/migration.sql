/*
  Warnings:

  - You are about to drop the `RoleDefinition` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "public"."RoleDefinition";

-- CreateTable
CREATE TABLE "public"."user_roles" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_name_key" ON "public"."user_roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_slug_key" ON "public"."user_roles"("slug");
