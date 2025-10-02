-- CreateTable
CREATE TABLE "attendance_periods" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "finalizedBy" TEXT,
    "finalizedAt" DATETIME,
    "unlockReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "attendance_periods_finalizedBy_fkey" FOREIGN KEY ("finalizedBy") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_attendance_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "staffId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "clockInTime" DATETIME,
    "clockOutTime" DATETIME,
    "totalHours" REAL,
    "zkTransactionId" TEXT NOT NULL,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fetchedById" TEXT NOT NULL,
    "syncJobId" TEXT,
    "syncedAt" DATETIME,
    "lastSyncStatus" TEXT,
    "conflictResolved" BOOLEAN NOT NULL DEFAULT false,
    "conflictResolvedBy" TEXT,
    "conflictNotes" TEXT,
    "periodId" TEXT,
    "isFinalized" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "attendance_records_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "attendance_records_fetchedById_fkey" FOREIGN KEY ("fetchedById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "attendance_records_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "attendance_periods" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_attendance_records" ("clockInTime", "clockOutTime", "createdAt", "date", "employeeId", "fetchedAt", "fetchedById", "id", "staffId", "totalHours", "updatedAt", "zkTransactionId") SELECT "clockInTime", "clockOutTime", "createdAt", "date", "employeeId", "fetchedAt", "fetchedById", "id", "staffId", "totalHours", "updatedAt", "zkTransactionId" FROM "attendance_records";
DROP TABLE "attendance_records";
ALTER TABLE "new_attendance_records" RENAME TO "attendance_records";
CREATE INDEX "attendance_records_staffId_date_idx" ON "attendance_records"("staffId", "date");
CREATE INDEX "attendance_records_date_idx" ON "attendance_records"("date");
CREATE INDEX "attendance_records_fetchedById_idx" ON "attendance_records"("fetchedById");
CREATE INDEX "attendance_records_employeeId_idx" ON "attendance_records"("employeeId");
CREATE INDEX "attendance_records_syncJobId_idx" ON "attendance_records"("syncJobId");
CREATE INDEX "attendance_records_lastSyncStatus_idx" ON "attendance_records"("lastSyncStatus");
CREATE INDEX "attendance_records_conflictResolved_idx" ON "attendance_records"("conflictResolved");
CREATE INDEX "attendance_records_periodId_idx" ON "attendance_records"("periodId");
CREATE INDEX "attendance_records_isFinalized_idx" ON "attendance_records"("isFinalized");
CREATE UNIQUE INDEX "attendance_records_staffId_date_zkTransactionId_key" ON "attendance_records"("staffId", "date", "zkTransactionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "attendance_periods_startDate_endDate_idx" ON "attendance_periods"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "attendance_periods_status_idx" ON "attendance_periods"("status");

-- CreateIndex
CREATE INDEX "attendance_periods_finalizedBy_idx" ON "attendance_periods"("finalizedBy");
