'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreVertical, User, Mail, Building, Clock } from 'lucide-react';
import type { Staff } from '../../../../types/staff';
import { formatDate } from '@/lib/utils';

interface StaffCardProps {
  staff: Staff;
  onEdit?: (staff: Staff) => void;
  onDelete?: (staff: Staff) => void;
  onView?: (staff: Staff) => void;
}

export function StaffCard({ staff, onEdit, onDelete, onView }: StaffCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <h3 className="font-semibold leading-none tracking-tight">
            {staff.name}
          </h3>
          <p className="text-sm text-muted-foreground">
            ID: {staff.employeeId}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={staff.isActive ? "default" : "secondary"}>
            {staff.isActive ? "Active" : "Inactive"}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onView && (
                <DropdownMenuItem onClick={() => onView(staff)}>
                  <User className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(staff)}>
                  Edit
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem 
                  onClick={() => onDelete(staff)}
                  className="text-destructive"
                >
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Building className="h-4 w-4" />
            <span>{staff.department}</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{staff.shiftSchedule}</span>
          </div>
          {staff.user && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              <span>{staff.user.email}</span>
            </div>
          )}
        </div>
        <div className="mt-4 text-xs text-muted-foreground">
          Created: {formatDate(new Date(staff.createdAt))}
        </div>
      </CardContent>
    </Card>
  );
}