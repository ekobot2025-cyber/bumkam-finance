import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { exec } from 'child_process';
import path from 'path';
import util from 'util';

const execPromise = util.promisify(exec);

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });

  try {
    const scriptPath = path.join(process.cwd(), 'scripts', 'run_all_tests.js');
    const { stdout, stderr } = await execPromise(`node "${scriptPath}"`);

    return NextResponse.json({
      success: true,
      output: stdout,
      errors: stderr,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      output: error.stdout || '',
      message: error.message,
    }, { status: 500 });
  }
}
