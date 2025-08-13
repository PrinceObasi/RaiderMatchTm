import { CheckCircle, XCircle, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { PasswordValidation } from "@/lib/validators";

interface PasswordStrengthIndicatorProps {
  password: string;
  validation: PasswordValidation;
  className?: string;
}

export function PasswordStrengthIndicator({ 
  password, 
  validation, 
  className 
}: PasswordStrengthIndicatorProps) {
  if (!password) return null;

  const { requirements, strength } = validation;

  const strengthColors = {
    weak: 'bg-destructive',
    medium: 'bg-amber-500',
    strong: 'bg-green-500'
  };

  const strengthText = {
    weak: 'Weak',
    medium: 'Medium', 
    strong: 'Strong'
  };

  const requirements_list = [
    { key: 'minLength', text: 'At least 8 characters' },
    { key: 'hasUppercase', text: 'One uppercase letter' },
    { key: 'hasLowercase', text: 'One lowercase letter' },
    { key: 'hasNumber', text: 'One number' },
    { key: 'hasSpecialChar', text: 'One special character' }
  ];

  return (
    <div className={cn("space-y-3", className)}>
      {/* Strength Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Password strength:</span>
          <span className={cn(
            "font-medium",
            strength === 'weak' && "text-destructive",
            strength === 'medium' && "text-amber-600",
            strength === 'strong' && "text-green-600"
          )}>
            {strengthText[strength]}
          </span>
        </div>
        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              strengthColors[strength]
            )}
            style={{ 
              width: strength === 'weak' ? '33%' : strength === 'medium' ? '66%' : '100%' 
            }}
          />
        </div>
      </div>

      {/* Requirements List */}
      <div className="space-y-1">
        <div className="text-sm text-muted-foreground mb-2">Password must include:</div>
        {requirements_list.map(({ key, text }) => {
          const isPassed = requirements[key as keyof typeof requirements];
          return (
            <div key={key} className="flex items-center gap-2 text-sm">
              {isPassed ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : password ? (
                <XCircle className="h-4 w-4 text-destructive" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground" />
              )}
              <span className={cn(
                isPassed ? "text-green-600" : password ? "text-destructive" : "text-muted-foreground"
              )}>
                {text}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}