-- CreateTable
CREATE TABLE "receivables" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "invoiceNumber" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "invoiceDate" DATETIME NOT NULL,
    "dueDate" DATETIME NOT NULL,
    "paidAmount" REAL NOT NULL DEFAULT 0.0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "assignedTo" TEXT NOT NULL DEFAULT 'SALES',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "receivables_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "receivables_invoiceNumber_key" ON "receivables"("invoiceNumber");

-- CreateIndex
CREATE INDEX "receivables_customerId_status_idx" ON "receivables"("customerId", "status");

-- CreateIndex
CREATE INDEX "receivables_dueDate_idx" ON "receivables"("dueDate");

-- CreateIndex
CREATE INDEX "receivables_status_assignedTo_idx" ON "receivables"("status", "assignedTo");

-- CreateIndex
CREATE INDEX "receivables_invoiceNumber_idx" ON "receivables"("invoiceNumber");

-- CreateIndex
CREATE INDEX "receivables_invoiceDate_idx" ON "receivables"("invoiceDate");
