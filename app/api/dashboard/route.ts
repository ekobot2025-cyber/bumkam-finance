import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDashboardData } from '@/lib/dashboardService';

export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const period = (searchParams.get('period') || '7days') as '7days' | 'month' | 'year';

  try {
    const data = getDashboardData(period);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Dashboard error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
