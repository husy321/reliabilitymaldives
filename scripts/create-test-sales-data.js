import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function createTestData() {
  try {
    console.log('🔍 Checking existing data...');
    
    // Check if we have outlets
    const outlets = await prisma.outlet.findMany();
    console.log(`Found ${outlets.length} outlets`);
    
    // Check if we have users
    const users = await prisma.user.findMany();
    console.log(`Found ${users.length} users`);
    
    // Check existing sales reports
    const reports = await prisma.salesReport.findMany();
    console.log(`Found ${reports.length} existing sales reports`);
    
    if (outlets.length === 0) {
      console.log('⚠️ No outlets found. Creating test outlets...');
      
      // Create test outlets
      const testOutlets = await Promise.all([
        prisma.outlet.create({
          data: {
            name: 'Main Branch',
            location: 'Malé',
            managerId: users[0]?.id || '1' // Use first user as manager
          }
        }),
        prisma.outlet.create({
          data: {
            name: 'Airport Branch',
            location: 'Velana International Airport',
            managerId: users[0]?.id || '1'
          }
        })
      ]);
      
      console.log(`✅ Created ${testOutlets.length} test outlets`);
    }
    
    if (reports.length === 0) {
      console.log('⚠️ No sales reports found. Creating test sales reports...');
      
      // Get outlets to use for reports
      const availableOutlets = await prisma.outlet.findMany();
      const availableUsers = await prisma.user.findMany();
      
      if (availableOutlets.length === 0 || availableUsers.length === 0) {
        console.log('❌ Cannot create sales reports without outlets and users');
        return;
      }
      
      // Create test sales reports for the last few days
      const testReports = [];
      const today = new Date();
      
      for (let i = 0; i < 5; i++) {
        const reportDate = new Date(today);
        reportDate.setDate(today.getDate() - i);
        
        const outlet = availableOutlets[i % availableOutlets.length];
        const user = availableUsers[0];
        
        const cashDeposits = Math.floor(Math.random() * 50000) + 10000;
        const cardSettlements = Math.floor(Math.random() * 30000) + 5000;
        const totalSales = cashDeposits + cardSettlements;
        
        testReports.push({
          outletId: outlet.id,
          date: reportDate,
          cashDeposits,
          cardSettlements,
          totalSales,
          submittedById: user.id,
          status: ['DRAFT', 'SUBMITTED', 'APPROVED'][Math.floor(Math.random() * 3)]
        });
      }
      
      // Create the reports
      for (const reportData of testReports) {
        try {
          await prisma.salesReport.create({
            data: reportData
          });
        } catch (error) {
          console.log(`⚠️ Skipping duplicate report for ${reportData.date.toDateString()}`);
        }
      }
      
      console.log(`✅ Created ${testReports.length} test sales reports`);
    }
    
    // Show final summary
    const finalReports = await prisma.salesReport.findMany({
      include: {
        outlet: true,
        submittedBy: true
      }
    });
    
    console.log('\n📊 Final Data Summary:');
    console.log(`Outlets: ${outlets.length}`);
    console.log(`Users: ${users.length}`);
    console.log(`Sales Reports: ${finalReports.length}`);
    
    if (finalReports.length > 0) {
      console.log('\n📋 Recent Sales Reports:');
      finalReports.forEach(report => {
        console.log(`- ${report.outlet.name}: MVR ${report.totalSales.toLocaleString()} (${report.status}) - ${report.date.toDateString()}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error creating test data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestData();
