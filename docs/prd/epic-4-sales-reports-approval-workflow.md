# Epic 4: Sales Reports & Approval Workflow

**Epic Goal:** Build sales report upload system with structured approval workflow, correction cycle management, and notification system enabling efficient manager-accountant coordination for daily sales processing.

## Story 4.1: Sales Report Data Structure

**As a developer,**
**I want a comprehensive sales report data model,**
**so that daily sales data can be stored with proper validation and relationships.**

### Acceptance Criteria
1. Sales report table with fields: outlet, date, cash deposits, card settlements, total sales
2. Database constraints preventing duplicate date submissions per outlet
3. Foreign key relationships linking reports to outlets and users

## Story 4.2: Manager Sales Report Upload Interface

**As an outlet manager,**
**I want a streamlined upload interface for daily sales reports,**
**so that I can quickly submit end-of-day sales data.**

### Acceptance Criteria
1. Sales report entry form with date validation and outlet auto-selection
2. Cash and card settlement input fields with automatic total calculation
3. Document attachment capability for supporting sales receipts

## Story 4.3a: Multi-Outlet Selection and Management Interface

**As a manager handling multiple outlets,**
**I want to select and manage multiple outlet locations,**
**so that I can work with reports from all my assigned locations.**

### Acceptance Criteria
1. Multi-outlet selection interface for managers with multiple locations
2. Outlet-specific context switching within the interface

## Story 4.3b: Batch Upload and Bulk Operations

**As a manager handling multiple outlets,**
**I want batch processing capabilities for efficiency,**
**so that I can handle multiple reports in one session.**

### Acceptance Criteria
1. Batch upload functionality for multiple dates or outlets
2. Bulk action capabilities for common operations

## Story 4.4a: Basic Split-Screen Review Layout

**As an accountant,**
**I want a split-screen interface for reviewing sales reports,**
**so that I can see reports and supporting documents simultaneously.**

### Acceptance Criteria
1. Split-screen layout showing sales report and linked supporting documents
2. Review status indicators (pending, approved, rejected) with visual feedback

## Story 4.4b: Advanced Comparison and Analysis Tools

**As an accountant,**
**I want comparison tools for detailed report analysis,**
**so that I can identify discrepancies and validate accuracy.**

### Acceptance Criteria
1. Comparison tools highlighting discrepancies or unusual patterns
2. Historical data comparison for trend analysis

## Story 4.5: Approval and Rejection Workflow

**As an accountant,**
**I want approval and rejection capabilities with detailed feedback,**
**so that managers understand what corrections are needed.**

### Acceptance Criteria
1. Approve/reject action buttons with required comment functionality
2. Rejection reason categorization (missing documents, calculation errors, etc.)
3. Batch approve functionality for multiple reports

## Story 4.6: Correction Cycle Management

**As a manager,**
**I want clear correction workflows when reports are rejected,**
**so that I can quickly identify and fix issues.**

### Acceptance Criteria
1. Rejected report notification with specific correction requirements
2. Report editing capability with change tracking and resubmission
3. Correction history display showing previous rejection reasons

## Story 4.7a: Real-time Workflow Notifications

**As a manager or accountant,**
**I want real-time notifications for workflow changes,**
**so that I'm immediately informed of status updates.**

### Acceptance Criteria
1. Real-time notifications for report submissions, approvals, and rejections

## Story 4.7b: Status Dashboard for Pending Reports

**As a manager or accountant,**
**I want a dashboard showing all pending reports,**
**so that I can prioritize my workflow actions.**

### Acceptance Criteria
1. Status dashboard showing pending reports requiring action

## Story 4.7c: Escalation Notifications and Timing

**As a supervisor,**
**I want escalation alerts for overdue report processing,**
**so that workflow bottlenecks are identified and resolved.**

### Acceptance Criteria
1. Escalation notifications for reports pending beyond defined timeframes
