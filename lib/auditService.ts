import getDb from './db';

interface RecordAuditParams {
  userId?: number | null;
  action: string;
  tableName: string;
  recordId: number;
  oldData?: any;
  newData?: any;
  reason?: string | null;
  ipAddress?: string | null;
}

export function recordAuditLog(params: RecordAuditParams) {
  try {
    const db = getDb();
    const stmt = db.prepare(`
      INSERT INTO audit_logs (user_id, action, table_name, record_id, old_data, new_data, reason, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      params.userId ?? null,
      params.action,
      params.tableName,
      params.recordId,
      params.oldData ? JSON.stringify(params.oldData) : null,
      params.newData ? JSON.stringify(params.newData) : null,
      params.reason ?? null,
      params.ipAddress ?? null
    );
  } catch (err) {
    console.error('Gagal mencatat audit log:', err);
  }
}
