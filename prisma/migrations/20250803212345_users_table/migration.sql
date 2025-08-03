-- CreateTable
CREATE TABLE "public"."users" (
    "id" UUID NOT NULL,
    "name" VARCHAR(32) NOT NULL,
    "surname" VARCHAR(32) NOT NULL,
    "nickname" VARCHAR(16) NOT NULL,
    "birthday" TIMESTAMP(3) NOT NULL,
    "height" SMALLINT,
    "weight" SMALLINT,
    "gender" VARCHAR(16) NOT NULL,
    "showGender" BOOLEAN NOT NULL DEFAULT true,
    "showHeight" BOOLEAN NOT NULL DEFAULT true,
    "showWeight" BOOLEAN NOT NULL DEFAULT true,
    "country_code" CHAR(2) NOT NULL,
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "currentLatitude" REAL,
    "currentLongitude" REAL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "role_name" TEXT NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_nickname_key" ON "public"."users"("nickname");

-- AddForeignKey
ALTER TABLE "public"."users" ADD CONSTRAINT "users_role_name_fkey" FOREIGN KEY ("role_name") REFERENCES "public"."user_roles"("name") ON DELETE RESTRICT ON UPDATE CASCADE;
