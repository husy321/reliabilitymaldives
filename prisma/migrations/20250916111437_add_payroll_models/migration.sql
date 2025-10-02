-- CreateTable
CREATE TABLE "payroll_periods" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "attendancePeriodId" TEXT NOT NULL,
    "startDate" DATETIME NOT NULL,
    "endDate" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "calculatedBy" TEXT,
    "calculatedAt" DATETIME,
    "totalHours" REAL NOT NULL DEFAULT 0.0,
    "totalOvertimeHours" REAL NOT NULL DEFAULT 0.0,
    "totalAmount" REAL NOT NULL DEFAULT 0.0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "payroll_periods_attendancePeriodId_fkey" FOREIGN KEY ("attendancePeriodId") REFERENCES "attendance_periods" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "payroll_periods_calculatedBy_fkey" FOREIGN KEY ("calculatedBy") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payroll_records" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "payrollPeriodId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "standardHours" REAL NOT NULL DEFAULT 0.0,
    "overtimeHours" REAL NOT NULL DEFAULT 0.0,
    "standardRate" REAL NOT NULL,
    "overtimeRate" REAL NOT NULL,
    "grossPay" REAL NOT NULL DEFAULT 0.0,
    "calculationData" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "payroll_records_payrollPeriodId_fkey" FOREIGN KEY ("payrollPeriodId") REFERENCES "payroll_periods" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "payroll_records_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "staff" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "payroll_periods_attendancePeriodId_idx" ON "payroll_periods"("attendancePeriodId");

-- CreateIndex
CREATE INDEX "payroll_periods_status_idx" ON "payroll_periods"("status");

-- CreateIndex
CREATE INDEX "payroll_periods_calculatedBy_idx" ON "payroll_periods"("calculatedBy");

-- CreateIndex
CREATE INDEX "payroll_periods_startDate_endDate_idx" ON "payroll_periods"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "payroll_records_payrollPeriodId_idx" ON "payroll_records"("payrollPeriodId");

-- CreateIndex
CREATE INDEX "payroll_records_employeeId_idx" ON "payroll_records"("employeeId");

-- CreateIndex
CREATE INDEX "payroll_records_payrollPeriodId_employeeId_idx" ON "payroll_records"("payrollPeriodId", "employeeId");
