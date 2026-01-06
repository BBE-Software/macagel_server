-- CreateTable
CREATE TABLE "futsal_venues" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "phone" VARCHAR(20),
    "rating" DOUBLE PRECISION DEFAULT 0,
    "osm_id" TEXT,
    "fields" INTEGER NOT NULL DEFAULT 1,
    "indoor" BOOLEAN NOT NULL DEFAULT false,
    "has_lighting" BOOLEAN NOT NULL DEFAULT true,
    "has_parking" BOOLEAN NOT NULL DEFAULT false,
    "has_locker_room" BOOLEAN NOT NULL DEFAULT false,
    "price_per_hour" DECIMAL(10,2),
    "added_by_user_id" UUID,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "futsal_venues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "match_join_requests" (
    "id" UUID NOT NULL,
    "lobby_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "venue_id" UUID,
    "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
    "message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "match_join_requests_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "match_lobbies" ADD COLUMN "venue_id" UUID;

-- CreateIndex
CREATE UNIQUE INDEX "futsal_venues_osm_id_key" ON "futsal_venues"("osm_id");

-- CreateIndex
CREATE INDEX "futsal_venues_latitude_longitude_idx" ON "futsal_venues"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "futsal_venues_verified_idx" ON "futsal_venues"("verified");

-- CreateIndex
CREATE INDEX "futsal_venues_osm_id_idx" ON "futsal_venues"("osm_id");

-- CreateIndex
CREATE UNIQUE INDEX "match_join_requests_lobby_id_user_id_key" ON "match_join_requests"("lobby_id", "user_id");

-- CreateIndex
CREATE INDEX "match_join_requests_lobby_id_status_idx" ON "match_join_requests"("lobby_id", "status");

-- CreateIndex
CREATE INDEX "match_join_requests_user_id_status_idx" ON "match_join_requests"("user_id", "status");

-- CreateIndex
CREATE INDEX "match_join_requests_venue_id_idx" ON "match_join_requests"("venue_id");

-- CreateIndex
CREATE INDEX "match_lobbies_venue_id_date_idx" ON "match_lobbies"("venue_id", "date");

-- AddForeignKey
ALTER TABLE "futsal_venues" ADD CONSTRAINT "futsal_venues_added_by_user_id_fkey" FOREIGN KEY ("added_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_lobbies" ADD CONSTRAINT "match_lobbies_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "futsal_venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_join_requests" ADD CONSTRAINT "match_join_requests_lobby_id_fkey" FOREIGN KEY ("lobby_id") REFERENCES "match_lobbies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_join_requests" ADD CONSTRAINT "match_join_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "match_join_requests" ADD CONSTRAINT "match_join_requests_venue_id_fkey" FOREIGN KEY ("venue_id") REFERENCES "futsal_venues"("id") ON DELETE SET NULL ON UPDATE CASCADE;






