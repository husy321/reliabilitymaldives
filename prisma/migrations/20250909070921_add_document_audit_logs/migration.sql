-- CreateTable
CREATE TABLE "document_audit_logs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessType" TEXT NOT NULL,
    "accessedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userRole" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    CONSTRAINT "document_audit_logs_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "document_audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "document_audit_logs_documentId_userId_idx" ON "document_audit_logs"("documentId", "userId");

-- CreateIndex
CREATE INDEX "document_audit_logs_accessedAt_idx" ON "document_audit_logs"("accessedAt");

-- CreateIndex
CREATE INDEX "document_audit_logs_userId_accessType_accessedAt_idx" ON "document_audit_logs"("userId", "accessType", "accessedAt");
