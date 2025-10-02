"use client"

import * as React from "react"
import { Check, X, Trash2, Send, MoreHorizontal, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Progress } from "@/components/ui/progress"

export interface BulkAction {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  requiresConfirmation?: boolean
  confirmationTitle?: string
  confirmationDescription?: string
  disabled?: boolean
}

export interface BulkActionToolbarProps {
  selectedItems: string[]
  totalItems: number
  actions: BulkAction[]
  isProcessing: boolean
  processingProgress?: number
  processingStatus?: string
  onAction: (actionId: string, selectedItems: string[]) => Promise<void>
  onSelectAll: () => void
  onClearSelection: () => void
  className?: string
}

export function BulkActionToolbar({
  selectedItems,
  totalItems,
  actions,
  isProcessing,
  processingProgress = 0,
  processingStatus,
  onAction,
  onSelectAll,
  onClearSelection,
  className = "",
}: BulkActionToolbarProps) {
  const [pendingAction, setPendingAction] = React.useState<BulkAction | null>(null)
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false)

  const hasSelection = selectedItems.length > 0
  const allSelected = selectedItems.length === totalItems && totalItems > 0

  const handleActionClick = (action: BulkAction) => {
    if (action.disabled || isProcessing) return
    
    if (action.requiresConfirmation) {
      setPendingAction(action)
      setShowConfirmDialog(true)
    } else {
      executeAction(action)
    }
  }

  const executeAction = async (action: BulkAction) => {
    try {
      await onAction(action.id, selectedItems)
    } catch (error) {
      console.error(`Failed to execute bulk action ${action.id}:`, error)
    }
  }

  const handleConfirmAction = async () => {
    if (pendingAction) {
      await executeAction(pendingAction)
      setPendingAction(null)
    }
    setShowConfirmDialog(false)
  }

  const handleCancelAction = () => {
    setPendingAction(null)
    setShowConfirmDialog(false)
  }

  // Split actions into primary and secondary based on importance
  const primaryActions = actions.slice(0, 2)
  const secondaryActions = actions.slice(2)

  if (!hasSelection && !isProcessing) {
    return null
  }

  return (
    <>
      <div className={`flex items-center justify-between p-3 bg-muted/50 border rounded-lg ${className}`}>
        <div className="flex items-center gap-4">
          {/* Selection Info */}
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {selectedItems.length} selected
            </Badge>
            
            {totalItems > 0 && (
              <span className="text-sm text-muted-foreground">
                of {totalItems}
              </span>
            )}
          </div>

          {/* Selection Actions */}
          {!isProcessing && (
            <div className="flex items-center gap-1">
              {!allSelected && totalItems > selectedItems.length && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onSelectAll}
                  disabled={isProcessing}
                >
                  Select All
                </Button>
              )}
              
              <Button
                variant="outline"
                size="sm"
                onClick={onClearSelection}
                disabled={isProcessing}
              >
                Clear
              </Button>
            </div>
          )}
        </div>

        {/* Processing Status */}
        {isProcessing && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">
                {processingStatus || 'Processing...'}
              </span>
            </div>
            
            {processingProgress > 0 && (
              <div className="w-32">
                <Progress value={processingProgress} className="h-2" />
              </div>
            )}
          </div>
        )}

        {/* Bulk Actions */}
        {!isProcessing && hasSelection && (
          <div className="flex items-center gap-2">
            <Separator orientation="vertical" className="h-6" />
            
            {/* Primary Actions */}
            {primaryActions.map((action) => {
              const IconComponent = action.icon
              return (
                <Button
                  key={action.id}
                  variant={action.variant || "outline"}
                  size="sm"
                  onClick={() => handleActionClick(action)}
                  disabled={action.disabled || isProcessing}
                >
                  <IconComponent className="h-4 w-4 mr-1" />
                  {action.label}
                </Button>
              )
            })}

            {/* Secondary Actions Dropdown */}
            {secondaryActions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {secondaryActions.map((action, index) => {
                    const IconComponent = action.icon
                    return (
                      <React.Fragment key={action.id}>
                        <DropdownMenuItem
                          onClick={() => handleActionClick(action)}
                          disabled={action.disabled || isProcessing}
                          className={action.variant === 'destructive' ? 'text-destructive' : ''}
                        >
                          <IconComponent className="h-4 w-4 mr-2" />
                          {action.label}
                        </DropdownMenuItem>
                        {index < secondaryActions.length - 1 && <DropdownMenuSeparator />}
                      </React.Fragment>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.confirmationTitle || `Confirm ${pendingAction?.label}`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.confirmationDescription || 
                `Are you sure you want to ${pendingAction?.label.toLowerCase()} ${selectedItems.length} item${selectedItems.length !== 1 ? 's' : ''}? This action cannot be undone.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelAction}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              className={pendingAction?.variant === 'destructive' ? 'bg-destructive text-destructive-foreground' : ''}
            >
              {pendingAction?.label}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

// Predefined common bulk actions
export const commonBulkActions: Record<string, BulkAction> = {
  submit: {
    id: 'submit',
    label: 'Submit',
    icon: Send,
    variant: 'default',
    requiresConfirmation: true,
    confirmationTitle: 'Submit Reports',
    confirmationDescription: 'Submit the selected reports for approval. Once submitted, reports cannot be edited.',
  },
  approve: {
    id: 'approve',
    label: 'Approve',
    icon: Check,
    variant: 'default',
    requiresConfirmation: true,
    confirmationTitle: 'Approve Reports',
    confirmationDescription: 'Approve the selected reports. This action will finalize the reports.',
  },
  reject: {
    id: 'reject',
    label: 'Reject',
    icon: X,
    variant: 'destructive',
    requiresConfirmation: true,
    confirmationTitle: 'Reject Reports',
    confirmationDescription: 'Reject the selected reports. Managers will need to resubmit them.',
  },
  delete: {
    id: 'delete',
    label: 'Delete',
    icon: Trash2,
    variant: 'destructive',
    requiresConfirmation: true,
    confirmationTitle: 'Delete Reports',
    confirmationDescription: 'Permanently delete the selected reports. This action cannot be undone.',
  },
}