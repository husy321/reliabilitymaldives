-- CreateTable
CREATE TABLE "outlets" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "managerId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "outlets_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "sales_reports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "outletId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "cashDeposits" REAL NOT NULL,
    "cardSettlements" REAL NOT NULL,
    "totalSales" REAL NOT NULL,
    "submittedById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "sales_reports_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "outlets" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "sales_reports_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_documents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "originalName" TEXT NOT NULL,
    "storedPath" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileHash" TEXT,
    "ipAddress" TEXT,
    "uploadedById" TEXT NOT NULL,
    "linkedToCustomerId" TEXT,
    "linkedToReceivableId" TEXT,
    "linkedToSalesReportId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "documents_linkedToSalesReportId_fkey" FOREIGN KEY ("linkedToSalesReportId") REFERENCES "sales_reports" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_documents" ("category", "createdAt", "fileHash", "fileSize", "id", "ipAddress", "linkedToCustomerId", "linkedToReceivableId", "linkedToSalesReportId", "mimeType", "originalName", "storedPath", "updatedAt", "uploadedById") SELECT "category", "createdAt", "fileHash", "fileSize", "id", "ipAddress", "linkedToCustomerId", "linkedToReceivableId", "linkedToSalesReportId", "mimeType", "originalName", "storedPath", "updatedAt", "uploadedById" FROM "documents";
DROP TABLE "documents";
ALTER TABLE "new_documents" RENAME TO "documents";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "outlets_name_key" ON "outlets"("name");

-- CreateIndex
CREATE INDEX "outlets_managerId_idx" ON "outlets"("managerId");

-- CreateIndex
CREATE INDEX "outlets_isActive_idx" ON "outlets"("isActive");

-- CreateIndex
CREATE INDEX "sales_reports_outletId_date_idx" ON "sales_reports"("outletId", "date");

-- CreateIndex
CREATE INDEX "sales_reports_status_idx" ON "sales_reports"("status");

-- CreateIndex
CREATE INDEX "sales_reports_submittedById_idx" ON "sales_reports"("submittedById");

-- CreateIndex
CREATE UNIQUE INDEX "sales_reports_outletId_date_key" ON "sales_reports"("outletId", "date");
