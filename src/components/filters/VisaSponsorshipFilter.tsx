import React from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface VisaSponsorshipFilterProps {
  value: "any" | "yes" | "no";
  onChange: (value: "any" | "yes" | "no") => void;
}

export function VisaSponsorshipFilter({ value, onChange }: VisaSponsorshipFilterProps) {
  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Visa Sponsorship</Label>
      <RadioGroup
        value={value}
        onValueChange={(val) => onChange(val as "any" | "yes" | "no")}
        className="flex flex-col space-y-2"
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="any" id="visa-any" />
          <Label htmlFor="visa-any" className="font-normal cursor-pointer">
            Any
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="yes" id="visa-yes" />
          <Label htmlFor="visa-yes" className="font-normal cursor-pointer">
            Sponsors Visa
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="no" id="visa-no" />
          <Label htmlFor="visa-no" className="font-normal cursor-pointer">
            No Visa Sponsorship
          </Label>
        </div>
      </RadioGroup>
    </div>
  );
}