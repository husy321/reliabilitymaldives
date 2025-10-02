import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]/route';

/**
 * GET /api/sales-reports - Simple test version
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Return sample data for testing
    return NextResponse.json({
      success: true,
      data: {
        reports: [],
        pagination: {
          page: 1,
          limit: 10,
          totalCount: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }
      }
    });

  } catch (error) {
    console.error('GET /api/sales-reports error:', error);
    return NextResponse.json({
      error: 'Failed to fetch sales reports'
    }, { status: 500 });
  }
}


