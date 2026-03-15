import { DataSourceManager } from '@/components/admin/DataSourceManager';
import { UserManagement } from '@/components/admin/UserManagement';
import { AuditLog } from '@/components/admin/AuditLog';
import { SystemHealth } from '@/components/admin/SystemHealth';
import { Settings } from 'lucide-react';

export default function AdminPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <h1 className="text-lg font-semibold flex items-center gap-2">
        <Settings className="h-5 w-5" /> Administration
      </h1>
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-6">
          <DataSourceManager />
          <SystemHealth />
        </div>
        <div className="space-y-6">
          <UserManagement />
          <AuditLog />
        </div>
      </div>
    </div>
  );
}
