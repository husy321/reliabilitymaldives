# Requirements

## Functional Requirements

**FR1:** The system shall provide a unified single-window interface for receivables coordination between Sales and Accounts teams with shared upload and view capabilities

**FR2:** The system shall implement drag-and-drop file upload functionality with 30-second target completion time for invoices, POs, and delivery orders

**FR3:** The system shall automatically categorize documents based on naming conventions (DO.xxxx/xx, PO.xxxx/xx, INV.xxxx/xx)

**FR4:** The system shall provide a follow-up sub-tab within receivables for tracking daily customer interactions with conversation logging linked to relevant invoices

**FR5:** The system shall generate automated notifications for accounts team when customer payments are due and require follow-up

**FR6:** The system shall allow follow-up resolution marking when payments are received and enable filtering/searching of historical follow-ups

**FR7:** The system shall generate and export customer statements showing current payables for customer service (PDF format)

**FR8:** The system shall export follow-up logs and conversation histories when requested (PDF format)

**FR9:** The system shall implement sales report approval workflow: Manager upload → Accountant review → Manager correction if rejected

**FR10:** The system shall prevent duplicate date submissions for outlet daily sales reports with validation

**FR11:** The system shall integrate with ZKT machine SDK to automatically fetch staff attendance data

**FR12:** The system shall allow Admin to manually amend individual staff punch-in/punch-out records when needed

**FR13:** The system shall support sequential workflow: Admin finalizes attendance → Accounts processes payroll

**FR14:** The system shall generate payroll based on finalized attendance data (with PDF export capability)

**FR15:** The system shall provide cross-team notifications for workflow updates and status changes

**FR16:** The system shall maintain role-based access control (Sales/Accounts for receivables, Manager for sales uploads, Accountant for sales review, Admin/Accounts for HR)

**FR17:** The system shall enable remote access for all authorized users from any location

## Non-Functional Requirements

**NFR1:** The system shall achieve 30-second maximum upload time for document processing under normal network conditions

**NFR2:** The system shall handle network outages gracefully with 1-2 hour acceptable wait time for reconnection

**NFR3:** The system shall prevent data loss during upload interruptions with automatic recovery mechanisms

**NFR4:** The system shall maintain data integrity with validation checks preventing duplicate date entries

**NFR5:** The system shall provide responsive web interface compatible with desktop and mobile devices

**NFR6:** The system shall ensure secure role-based access with proper authentication and authorization

**NFR7:** The system shall maintain audit trails for all financial document uploads and approvals

**NFR8:** The system shall support concurrent access for multiple users without performance degradation

**NFR9:** The system shall provide reliable ZKT SDK integration with fallback manual entry capabilities

**NFR10:** The system shall ensure data backup and recovery capabilities for business continuity
