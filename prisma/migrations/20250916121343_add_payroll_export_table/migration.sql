-- CreateTable
CREATE TABLE "payroll_exports" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "payrollPeriodId" TEXT NOT NULL,
    "exportedBy" TEXT NOT NULL,
    "exportedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "exportFormat" TEXT NOT NULL DEFAULT 'PDF',
    "fileName" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'GENERATING',
    "metadata" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "payroll_exports_payrollPeriodId_fkey" FOREIGN KEY ("payrollPeriodId") REFERENCES "payroll_periods" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "payroll_exports_exportedBy_fkey" FOREIGN KEY ("exportedBy") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "payroll_exports_payrollPeriodId_idx" ON "payroll_exports"("payrollPeriodId");

-- CreateIndex
CREATE INDEX "payroll_exports_exportedBy_idx" ON "payroll_exports"("exportedBy");

-- CreateIndex
CREATE INDEX "payroll_exports_status_idx" ON "payroll_exports"("status");

-- CreateIndex
CREATE INDEX "payroll_exports_exportedAt_idx" ON "payroll_exports"("exportedAt");
