import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Users, Plus } from 'lucide-react';

const SAMPLE_USERS = [
  {
    id: '1',
    email: 'admin@sentinel.io',
    displayName: 'Admin User',
    role: 'admin',
    avatarColor: '#ef4444',
  },
  {
    id: '2',
    email: 'analyst1@sentinel.io',
    displayName: 'Jane Smith',
    role: 'analyst',
    avatarColor: '#3b82f6',
  },
  {
    id: '3',
    email: 'analyst2@sentinel.io',
    displayName: 'John Doe',
    role: 'analyst',
    avatarColor: '#10b981',
  },
  {
    id: '4',
    email: 'viewer@sentinel.io',
    displayName: 'Observer One',
    role: 'viewer',
    avatarColor: '#f59e0b',
  },
];

export function UserManagement() {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="text-sm flex items-center gap-2">
          <Users className="h-4 w-4" /> Users
        </CardTitle>
        <Button size="sm" className="h-7 text-xs">
          <Plus className="h-3 w-3 mr-1" /> Add User
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {SAMPLE_USERS.map((u) => (
          <div
            key={u.id}
            className="flex items-center gap-3 rounded-md border p-2.5"
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback
                style={{ backgroundColor: u.avatarColor }}
                className="text-white text-xs"
              >
                {u.displayName
                  .split(' ')
                  .map((n) => n[0])
                  .join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="text-sm font-medium">{u.displayName}</div>
              <div className="text-[10px] text-muted-foreground">
                {u.email}
              </div>
            </div>
            <Badge variant="outline" className="text-[10px]">
              {u.role}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
