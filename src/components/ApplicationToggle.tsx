import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { CheckCircle, Circle } from 'lucide-react';
import { useToggleApplication } from '@/hooks/useMyApplications';
import { cn } from '@/lib/utils';

interface ApplicationToggleProps {
  internshipId: string;
  className?: string;
}

export function ApplicationToggle({ internshipId, className }: ApplicationToggleProps) {
  const { isApplied, markApplied, unmarkApplied, isLoading } = useToggleApplication(internshipId);

  const handleToggle = () => {
    if (isApplied) {
      unmarkApplied();
    } else {
      markApplied({});
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={isApplied ? "default" : "outline"}
            size="sm"
            onClick={handleToggle}
            disabled={isLoading}
            className={cn(
              "gap-2 text-xs transition-all duration-200",
              isApplied && "bg-green-100 text-green-800 border-green-200 hover:bg-green-200",
              className
            )}
          >
            {isApplied ? (
              <>
                <CheckCircle className="h-3 w-3" />
                Applied
              </>
            ) : (
              <>
                <Circle className="h-3 w-3" />
                I applied
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Use this to track roles you've actually applied to</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}