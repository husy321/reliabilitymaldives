/**
 * Script to auto-complete follow-ups for already-paid invoices
 *
 * This script finds all receivables with status = PAID that have active follow-ups,
 * and marks those follow-ups as COMPLETED.
 *
 * Usage: npx tsx scripts/fix-completed-followups.ts
 */

import { prisma } from '../src/lib/prisma';

async function fixCompletedFollowups() {
  console.log('🔍 Finding paid invoices with active follow-ups...\n');

  try {
    // Find all paid receivables
    const paidReceivables = await prisma.receivable.findMany({
      where: {
        status: 'PAID'
      },
      select: {
        id: true,
        invoiceNumber: true,
        updatedAt: true
      }
    });

    console.log(`✅ Found ${paidReceivables.length} paid invoices\n`);

    let totalUpdated = 0;

    // For each paid receivable, check for active follow-ups
    for (const receivable of paidReceivables) {
      const activeFollowUps = await prisma.followUp.findMany({
        where: {
          receivableId: receivable.id,
          status: {
            in: ['PENDING', 'IN_PROGRESS']
          }
        }
      });

      if (activeFollowUps.length > 0) {
        console.log(`📋 Invoice ${receivable.invoiceNumber}:`);
        console.log(`   - Found ${activeFollowUps.length} active follow-up(s)`);

        // Update follow-ups to COMPLETED
        const result = await prisma.followUp.updateMany({
          where: {
            receivableId: receivable.id,
            status: {
              in: ['PENDING', 'IN_PROGRESS']
            }
          },
          data: {
            status: 'COMPLETED',
            completedAt: receivable.updatedAt // Use the invoice's last update time
          }
        });

        console.log(`   ✅ Updated ${result.count} follow-up(s) to COMPLETED\n`);
        totalUpdated += result.count;
      }
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✨ Summary:`);
    console.log(`   - Checked: ${paidReceivables.length} paid invoices`);
    console.log(`   - Updated: ${totalUpdated} follow-ups to COMPLETED`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (totalUpdated === 0) {
      console.log('✅ No follow-ups needed updating. All follow-ups are already in sync!');
    } else {
      console.log('✅ Successfully updated all follow-ups for paid invoices!');
    }

  } catch (error) {
    console.error('❌ Error fixing follow-ups:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fixCompletedFollowups()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });