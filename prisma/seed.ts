import { PrismaClient, UserRole } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create roles with permission definitions
  const roles = [
    {
      name: 'ADMIN',
      description: 'Administrator with full system access',
      permissions: {
        users: ['create', 'read', 'update', 'delete'],
        roles: ['create', 'read', 'update', 'delete'],
        audit: ['read'],
        system: ['configure', 'backup', 'restore'],
        all_modules: ['create', 'read', 'update', 'delete']
      }
    },
    {
      name: 'MANAGER',
      description: 'Manager with oversight and reporting access',
      permissions: {
        users: ['read', 'update'],
        reports: ['create', 'read', 'update', 'delete'],
        audit: ['read'],
        receivables: ['read', 'update'],
        payments: ['read', 'update'],
        documents: ['read', 'update']
      }
    },
    {
      name: 'ACCOUNTANT',
      description: 'Accountant with financial data access',
      permissions: {
        receivables: ['create', 'read', 'update'],
        payments: ['create', 'read', 'update', 'delete'],
        reports: ['create', 'read'],
        documents: ['create', 'read', 'update'],
        audit: ['read']
      }
    },
    {
      name: 'ACCOUNTS',
      description: 'Accounts team with receivables and payment management',
      permissions: {
        receivables: ['create', 'read', 'update'],
        payments: ['create', 'read', 'update'],
        reports: ['read'],
        documents: ['create', 'read', 'update']
      }
    },
    {
      name: 'SALES',
      description: 'Sales team with customer and receivables access',
      permissions: {
        receivables: ['create', 'read', 'update'],
        customers: ['create', 'read', 'update'],
        reports: ['read'],
        documents: ['create', 'read']
      }
    }
  ]

  // Upsert roles (idempotent operation)
  for (const roleData of roles) {
    const role = await prisma.role.upsert({
      where: { name: roleData.name },
      update: {
        description: roleData.description,
        permissions: roleData.permissions
      },
      create: {
        name: roleData.name,
        description: roleData.description,
        permissions: roleData.permissions
      }
    })
    console.log(`✅ Created/updated role: ${role.name}`)
  }

  // Create default admin user if it doesn't exist
  const adminRole = await prisma.role.findUnique({
    where: { name: 'ADMIN' }
  })

  if (adminRole) {
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@reliabilitymaldives.com' }
    })

    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('admin123', 12)
      
      const adminUser = await prisma.user.create({
        data: {
          email: 'admin@reliabilitymaldives.com',
          name: 'System Administrator',
          password_hash: hashedPassword,
          role: UserRole.ADMIN,
          roleId: adminRole.id,
          isActive: true
        }
      })
      console.log(`✅ Created admin user: ${adminUser.email}`)
    } else {
      console.log('ℹ️  Admin user already exists')
    }
  }

  console.log('🌱 Database seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error during database seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })