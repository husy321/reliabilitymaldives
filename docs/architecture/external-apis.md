# External APIs

## ZKT Machine API

- **Purpose:** Automated staff attendance data retrieval for payroll processing workflow
- **Documentation:** [User must provide ZKT SDK documentation - version and API specs unknown from PRD]
- **Base URL(s):** Local network machine IP addresses (typically 192.168.x.x range)
- **Authentication:** Machine-specific authentication (SDK dependent)
- **Rate Limits:** Unknown - requires ZKT documentation review

**Key Endpoints Used:**
- `GET /attendance/data` - Fetch attendance records by date range
- `GET /employees` - Retrieve employee list and ID mapping
- `POST /test-connection` - Verify machine connectivity

**Integration Notes:** The PRD identifies this as a high technical risk area requiring early investigation. The ZKT SDK integration will be wrapped in a service layer to abstract machine-specific details and provide fallback manual entry capabilities.
