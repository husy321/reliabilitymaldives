-- CreateTable
CREATE TABLE "invoice_followups" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "receivableId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "followupDate" DATETIME NOT NULL,
    "priority" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL,
    "contactMethod" TEXT NOT NULL,
    "initialNotes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    CONSTRAINT "invoice_followups_receivableId_fkey" FOREIGN KEY ("receivableId") REFERENCES "receivables" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "invoice_followups_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "invoice_followups_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "followup_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "followUpId" TEXT NOT NULL,
    "contactDate" DATETIME NOT NULL,
    "contactMethod" TEXT NOT NULL,
    "personContacted" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "nextStep" TEXT,
    "nextStepDate" DATETIME,
    "loggedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "followup_logs_followUpId_fkey" FOREIGN KEY ("followUpId") REFERENCES "invoice_followups" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "followup_logs_loggedById_fkey" FOREIGN KEY ("loggedById") REFERENCES "users" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "invoice_followups_followupDate_idx" ON "invoice_followups"("followupDate");

-- CreateIndex
CREATE INDEX "invoice_followups_priority_idx" ON "invoice_followups"("priority");

-- CreateIndex
CREATE INDEX "invoice_followups_status_idx" ON "invoice_followups"("status");

-- CreateIndex
CREATE INDEX "invoice_followups_customerId_idx" ON "invoice_followups"("customerId");

-- CreateIndex
CREATE INDEX "invoice_followups_receivableId_idx" ON "invoice_followups"("receivableId");

-- CreateIndex
CREATE INDEX "followup_logs_followUpId_idx" ON "followup_logs"("followUpId");

-- CreateIndex
CREATE INDEX "followup_logs_contactDate_idx" ON "followup_logs"("contactDate");

-- CreateIndex
CREATE INDEX "followup_logs_nextStepDate_idx" ON "followup_logs"("nextStepDate");
