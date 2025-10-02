# Database Backup Strategy - Production Environment

## Overview
This document outlines the comprehensive database backup strategy for the Reliability Maldives business management system, ensuring data integrity, disaster recovery capabilities, and business continuity.

## Database Configuration
- **Database System**: PostgreSQL v15+
- **Environment**: Production
- **Database Name**: reliabilitymaldives
- **Critical Data**: User accounts, roles, audit logs, financial records

## Backup Strategy

### 1. Backup Types and Frequency

#### Full Database Backups
- **Schedule**: Daily at 2:00 AM Maldivian Time
- **Retention**: 30 days
- **Location**: Primary backup server + cloud storage
- **Method**: `pg_dump` with custom format for faster restores

#### Incremental Backups
- **Schedule**: Every 6 hours during business hours (8 AM, 2 PM, 8 PM)
- **Retention**: 7 days
- **Method**: WAL (Write-Ahead Logging) archiving
- **Location**: Separate partition on backup server

#### Point-in-Time Recovery Archives
- **Schedule**: Continuous WAL archiving
- **Retention**: 7 days
- **Purpose**: Recovery to any specific timestamp within retention period

### 2. Backup Commands and Scripts

#### Daily Full Backup Script
```bash
#!/bin/bash
# daily_backup.sh
BACKUP_DIR="/backups/postgresql/daily"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="reliabilitymaldives"
BACKUP_FILE="${BACKUP_DIR}/reliability_backup_${DATE}.dump"

# Create backup directory if it doesn't exist
mkdir -p $BACKUP_DIR

# Perform backup
pg_dump -h localhost -U postgres -Fc -b -v -f $BACKUP_FILE $DB_NAME

# Compress and encrypt backup
gpg --cipher-algo AES256 --compress-algo 1 --s2k-cipher-algo AES256 \
    --s2k-digest-algo SHA512 --s2k-mode 3 --s2k-count 65011712 \
    --output $BACKUP_FILE.gpg --symmetric $BACKUP_FILE

# Remove unencrypted backup
rm $BACKUP_FILE

# Clean up old backups (keep 30 days)
find $BACKUP_DIR -name "*.gpg" -mtime +30 -delete

# Upload to cloud storage (AWS S3/DigitalOcean Spaces)
aws s3 cp $BACKUP_FILE.gpg s3://reliability-backups/postgresql/daily/

echo "Backup completed: $BACKUP_FILE.gpg"
```

#### WAL Archive Script
```bash
#!/bin/bash
# wal_archive.sh
WAL_ARCHIVE_DIR="/backups/postgresql/wal_archive"
mkdir -p $WAL_ARCHIVE_DIR
cp $1 $WAL_ARCHIVE_DIR/
```

### 3. PostgreSQL Configuration

#### postgresql.conf Settings
```ini
# WAL Configuration for Point-in-Time Recovery
wal_level = replica
archive_mode = on
archive_command = '/scripts/wal_archive.sh %p'
max_wal_senders = 3
checkpoint_completion_target = 0.9

# Backup-friendly settings
full_page_writes = on
wal_log_hints = on
```

### 4. Restore Procedures

#### Full Database Restore
```bash
#!/bin/bash
# restore_database.sh
BACKUP_FILE=$1
DB_NAME="reliabilitymaldives"

# Decrypt backup
gpg --decrypt $BACKUP_FILE > backup_decrypted.dump

# Drop existing database (CAUTION: Production use only in disaster)
dropdb -h localhost -U postgres $DB_NAME

# Create new database
createdb -h localhost -U postgres $DB_NAME

# Restore from backup
pg_restore -h localhost -U postgres -d $DB_NAME -v backup_decrypted.dump

# Clean up decrypted file
rm backup_decrypted.dump

echo "Database restore completed"
```

#### Point-in-Time Recovery
```bash
#!/bin/bash
# point_in_time_restore.sh
RECOVERY_TARGET_TIME=$1  # Format: '2025-09-02 14:30:00'
BASE_BACKUP_DIR="/backups/postgresql/daily"
WAL_ARCHIVE_DIR="/backups/postgresql/wal_archive"

# Stop PostgreSQL service
sudo systemctl stop postgresql

# Restore base backup
# (Detailed steps depend on specific backup file and target timestamp)

# Configure recovery.conf
echo "restore_command = 'cp $WAL_ARCHIVE_DIR/%f %p'" > recovery.conf
echo "recovery_target_time = '$RECOVERY_TARGET_TIME'" >> recovery.conf

# Start PostgreSQL service
sudo systemctl start postgresql
```

### 5. Backup Validation and Testing

#### Automated Validation
```bash
#!/bin/bash
# validate_backup.sh
BACKUP_FILE=$1
TEST_DB="test_restore_$(date +%Y%m%d_%H%M%S)"

# Create test database and restore
createdb -h localhost -U postgres $TEST_DB
pg_restore -h localhost -U postgres -d $TEST_DB $BACKUP_FILE

# Run validation queries
psql -h localhost -U postgres -d $TEST_DB -c "SELECT COUNT(*) FROM users;"
psql -h localhost -U postgres -d $TEST_DB -c "SELECT COUNT(*) FROM roles;"
psql -h localhost -U postgres -d $TEST_DB -c "SELECT COUNT(*) FROM audit_logs;"

# Clean up test database
dropdb -h localhost -U postgres $TEST_DB

echo "Backup validation completed"
```

#### Monthly Restore Testing
- **Schedule**: First Sunday of each month
- **Process**: Full restore to isolated test environment
- **Validation**: Complete application functionality testing
- **Documentation**: Test results logged in operations journal

### 6. Storage and Security

#### Backup Storage Locations
1. **Primary**: Local backup server (RAID 1 configuration)
2. **Secondary**: Network-attached storage (NAS) with automatic sync
3. **Offsite**: Cloud storage service (encrypted at rest and in transit)

#### Security Measures
- **Encryption**: AES-256 encryption for all backup files
- **Access Control**: Limited to database administrators and system administrators
- **Key Management**: Encryption keys stored in secure key management system
- **Network Security**: Backups transferred over secure channels (SSH/TLS)

### 7. Monitoring and Alerting

#### Backup Monitoring
```bash
# Cron job to check backup completion
#!/bin/bash
# backup_monitor.sh
EXPECTED_BACKUP_TIME="03:00"
CURRENT_TIME=$(date +%H:%M)
TODAY_BACKUP_COUNT=$(ls /backups/postgresql/daily/*$(date +%Y%m%d)*.gpg 2>/dev/null | wc -l)

if [ $CURRENT_TIME > "04:00" ] && [ $TODAY_BACKUP_COUNT -eq 0 ]; then
    # Send alert - backup failed
    echo "ALERT: Daily backup failed for $(date)" | mail -s "Backup Failure Alert" admin@reliabilitymaldives.com
fi
```

#### Alert Conditions
- Backup job failure or timeout
- Backup file corruption detected
- Insufficient storage space (< 20% free)
- Cloud storage upload failure
- Restore test failure

### 8. Disaster Recovery Procedures

#### Recovery Time Objective (RTO)
- **Target**: 4 hours maximum
- **Critical Functions**: User authentication, core business operations
- **Full System**: 8 hours maximum

#### Recovery Point Objective (RPO)
- **Maximum Data Loss**: 15 minutes (via WAL archiving)
- **Typical Data Loss**: < 5 minutes during business hours

#### Disaster Recovery Steps
1. **Assessment**: Identify scope and nature of disaster
2. **Communication**: Notify stakeholders and users
3. **Recovery Environment**: Provision replacement infrastructure
4. **Database Restore**: Execute appropriate restore procedure
5. **Application Deployment**: Deploy application stack
6. **Validation**: Comprehensive functionality testing
7. **Go-Live**: Switch users to recovered system
8. **Post-Recovery**: Monitor and document lessons learned

### 9. Maintenance and Review

#### Regular Maintenance Tasks
- **Weekly**: Verify backup completion and file integrity
- **Monthly**: Test restore procedures on sample backups
- **Quarterly**: Review and update backup retention policies
- **Annually**: Complete disaster recovery drill and documentation update

#### Contact Information
- **Database Administrator**: dba@reliabilitymaldives.com
- **System Administrator**: sysadmin@reliabilitymaldives.com
- **Emergency Contact**: +960-XXXX-XXXX (24/7 support)

#### Documentation Updates
- **Last Updated**: September 2, 2025
- **Next Review**: December 2, 2025
- **Version**: 1.0

---

**Note**: This strategy document should be reviewed and updated regularly to reflect changes in infrastructure, requirements, and best practices. All personnel involved in backup and recovery operations must be trained on these procedures.