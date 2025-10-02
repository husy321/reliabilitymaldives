"use client"

import * as React from "react"
import { format, isWithinInterval, isBefore, isAfter } from "date-fns"
import { CalendarIcon, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Badge } from "@/components/ui/badge"
import { SelectRangeEventHandler, DateRange } from "react-day-picker"
import { useBatchOperationStore, useBatchSessionPersistence } from "@/stores/batchOperationStore"

export interface BatchDatePickerProps {
  mode?: 'multiple' | 'range'
  onChange?: (dates: Date[] | DateRange | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  disableFuture?: boolean
  disablePast?: boolean
  maxDates?: number
  minDates?: number
  validateDateRange?: boolean
  useStore?: boolean // Whether to use the global store or local state
}

export function BatchDatePicker({
  mode,
  onChange,
  placeholder = "Select dates",
  disabled = false,
  className,
  disableFuture = true,
  disablePast = false,
  maxDates = 31,
  minDates = 1,
  validateDateRange = true,
  useStore = true,
}: BatchDatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [localDates, setLocalDates] = React.useState<Date[]>([])
  const [localRange, setLocalRange] = React.useState<DateRange | undefined>()

  // Use global store or local state
  const {
    selectedDates: storeDates,
    selectedRange: storeRange,
    dateMode: storeMode,
    setSelectedDates: setStoreDates,
    setSelectedRange: setStoreRange,
    setDateMode: setStoreMode,
  } = useBatchOperationStore()

  // Use session persistence if using store
  useBatchSessionPersistence()

  // Determine which state to use
  const effectiveMode = mode || (useStore ? storeMode : 'multiple')
  const selectedDates = useStore ? storeDates : localDates
  const selectedRange = useStore ? storeRange : localRange

  // Update store mode when mode prop changes
  React.useEffect(() => {
    if (useStore && mode && mode !== storeMode) {
      setStoreMode(mode)
    }
  }, [mode, storeMode, setStoreMode, useStore])

  const today = new Date()
  const disabledDays = []
  
  if (disableFuture) {
    disabledDays.push({ after: today })
  }
  
  if (disablePast) {
    disabledDays.push({ before: today })
  }

  const handleMultipleSelect = (dates: Date[] | undefined) => {
    const finalDates = dates || []

    // Validate max dates
    if (finalDates.length > maxDates) {
      setError(`Cannot select more than ${maxDates} dates`)
      return
    }

    // Validate min dates
    if (finalDates.length < minDates && finalDates.length > 0) {
      setError(`Must select at least ${minDates} date${minDates > 1 ? 's' : ''}`)
    } else {
      setError(null)
    }

    // Update state
    if (useStore) {
      setStoreDates(finalDates)
    } else {
      setLocalDates(finalDates)
    }

    // Call external onChange
    onChange?.(finalDates)
  }

  const handleRangeSelect: SelectRangeEventHandler = (range: DateRange | undefined) => {
    // Validate complete range
    if (range && range.from && range.to) {
      const daysDiff = Math.ceil((range.to.getTime() - range.from.getTime()) / (1000 * 60 * 60 * 24)) + 1
      
      if (daysDiff > maxDates) {
        setError(`Date range cannot exceed ${maxDates} days`)
        return
      }

      if (daysDiff < minDates) {
        setError(`Date range must be at least ${minDates} day${minDates > 1 ? 's' : ''}`)
        return
      }

      setError(null)
    } else {
      setError(null)
    }

    // Update state
    if (useStore) {
      setStoreRange(range)
    } else {
      setLocalRange(range)
    }

    // Call external onChange
    onChange?.(range)
  }

  const removeSingleDate = (dateToRemove: Date) => {
    if (effectiveMode === 'multiple' && selectedDates) {
      const newDates = selectedDates.filter(date => 
        date.getTime() !== dateToRemove.getTime()
      )
      
      if (useStore) {
        setStoreDates(newDates)
      } else {
        setLocalDates(newDates)
      }
      
      onChange?.(newDates)
    }
  }

  const clearAllDates = () => {
    setError(null)
    
    if (effectiveMode === 'multiple') {
      if (useStore) {
        setStoreDates([])
      } else {
        setLocalDates([])
      }
      onChange?.([])
    } else {
      if (useStore) {
        setStoreRange(undefined)
      } else {
        setLocalRange(undefined)
      }
      onChange?.(undefined)
    }
  }

  const getDisplayText = () => {
    if (effectiveMode === 'multiple') {
      if (!selectedDates || selectedDates.length === 0) {
        return placeholder
      }
      if (selectedDates.length === 1) {
        return format(selectedDates[0], "PPP")
      }
      return `${selectedDates.length} dates selected`
    } else {
      if (!selectedRange || !selectedRange.from) {
        return placeholder
      }
      if (!selectedRange.to) {
        return format(selectedRange.from, "PPP")
      }
      return `${format(selectedRange.from, "PPP")} - ${format(selectedRange.to, "PPP")}`
    }
  }

  const hasSelection = effectiveMode === 'multiple' 
    ? selectedDates && selectedDates.length > 0
    : selectedRange && selectedRange.from

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !hasSelection && "text-muted-foreground",
              className
            )}
            disabled={disabled}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {getDisplayText()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">
                Select {effectiveMode === 'multiple' ? 'Dates' : 'Date Range'}
              </div>
              {hasSelection && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearAllDates}
                >
                  Clear All
                </Button>
              )}
            </div>
            
            <Calendar
              mode={effectiveMode === 'multiple' ? 'multiple' : 'range'}
              selected={effectiveMode === 'multiple' ? selectedDates : selectedRange}
              onSelect={effectiveMode === 'multiple' ? handleMultipleSelect : handleRangeSelect}
              disabled={disabledDays}
              initialFocus
              max={effectiveMode === 'multiple' ? maxDates : undefined}
            />
            
            {error && (
              <div className="text-xs text-red-500 px-2">
                {error}
              </div>
            )}
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Selected Dates Display */}
      {effectiveMode === 'multiple' && selectedDates && selectedDates.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">
            Selected dates ({selectedDates.length}):
          </div>
          <div className="flex flex-wrap gap-1">
            {selectedDates.map((date, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {format(date, "MMM dd, yyyy")}
                <button
                  type="button"
                  onClick={() => removeSingleDate(date)}
                  className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full p-0.5"
                  disabled={disabled}
                >
                  <X className="h-2 w-2" />
                </button>
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Selected Range Display */}
      {effectiveMode === 'range' && selectedRange && selectedRange.from && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">
            Selected range:
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              From: {format(selectedRange.from, "MMM dd, yyyy")}
            </Badge>
            {selectedRange.to && (
              <Badge variant="secondary" className="text-xs">
                To: {format(selectedRange.to, "MMM dd, yyyy")}
              </Badge>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="text-xs text-red-500">
          {error}
        </div>
      )}
    </div>
  )
}