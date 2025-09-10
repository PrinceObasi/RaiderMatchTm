import React from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";

interface GPAFilterProps {
  value: number;
  onChange: (value: number) => void;
}

export function GPAFilter({ value, onChange }: GPAFilterProps) {
  const handleSliderChange = (values: number[]) => {
    onChange(values[0]);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = parseFloat(e.target.value);
    if (!isNaN(inputValue) && inputValue >= 0 && inputValue <= 4.0) {
      onChange(inputValue);
    }
  };

  return (
    <div className="space-y-4">
      <Label className="text-sm font-medium">Minimum GPA</Label>
      
      {/* Slider */}
      <div className="px-2">
        <Slider
          value={[value]}
          onValueChange={handleSliderChange}
          max={4.0}
          min={0}
          step={0.1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>0.0</span>
          <span>2.0</span>
          <span>4.0</span>
        </div>
      </div>

      {/* Numeric Input */}
      <div className="flex items-center space-x-2">
        <Label htmlFor="gpa-input" className="text-sm whitespace-nowrap">
          GPA:
        </Label>
        <Input
          id="gpa-input"
          type="number"
          min="0"
          max="4.0"
          step="0.1"
          value={value.toFixed(1)}
          onChange={handleInputChange}
          className="w-20 h-8 text-sm"
        />
        <span className="text-sm text-muted-foreground">/ 4.0</span>
      </div>

      {value > 0 && (
        <p className="text-xs text-muted-foreground">
          Showing internships requiring {value.toFixed(1)} GPA or higher
        </p>
      )}
    </div>
  );
}