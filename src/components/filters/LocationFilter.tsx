import React, { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

const LOCATION_OPTIONS = [
  "Austin",
  "Dallas",
  "Houston",
  "Remote",
  "San Antonio",
  "Fort Worth",
  "El Paso",
  "Arlington",
  "Corpus Christi",
  "Plano",
];

interface LocationFilterProps {
  value: string[];
  onChange: (locations: string[]) => void;
}

export function LocationFilter({ value, onChange }: LocationFilterProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const filteredOptions = LOCATION_OPTIONS.filter((location) =>
    location.toLowerCase().includes(searchValue.toLowerCase())
  );

  const toggleLocation = (location: string) => {
    const newLocations = value.includes(location)
      ? value.filter((l) => l !== location)
      : [...value, location];
    onChange(newLocations);
  };

  const selectAll = () => {
    onChange(LOCATION_OPTIONS);
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Location</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-10"
          >
            {value.length === 0
              ? "Select locations..."
              : value.length === 1
              ? value[0]
              : `${value.length} locations selected`}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0 z-[100] pointer-events-auto bg-popover" align="start">
          <Command>
            <CommandInput
              placeholder="Search locations..."
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList>
              <CommandEmpty>No locations found.</CommandEmpty>
              <CommandGroup>
                <div className="flex gap-2 p-2 border-b">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={selectAll}
                    className="h-6 text-xs"
                  >
                    Select All
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAll}
                    className="h-6 text-xs"
                  >
                    Clear All
                  </Button>
                </div>
                {filteredOptions.map((location) => (
                  <CommandItem
                    key={location}
                    onSelect={() => toggleLocation(location)}
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    <Checkbox
                      checked={value.includes(location)}
                      onChange={() => toggleLocation(location)}
                    />
                    <span>{location}</span>
                    {value.includes(location) && (
                      <Check className="ml-auto h-4 w-4" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}