import React, { useState, useMemo } from "react";
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
import { Badge } from "@/components/ui/badge";

const QUICK_LOCATIONS = [
  'Remote',
  'New York, NY',
  'San Francisco, CA',
  'Austin, TX',
  'Boston, MA',
  'Seattle, WA',
  'Atlanta, GA',
  'Mountain View, CA',
  'Pittsburgh, PA',
  'Chicago, IL',
  'San Jose, CA',
  'Salt Lake City, UT',
];

interface LocationMultiSelectProps {
  value: string[];
  onChange: (locations: string[]) => void;
  name: string;
}

export function LocationMultiSelect({ value, onChange, name }: LocationMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const allLocations = QUICK_LOCATIONS;
  
  // Get all unique Texas cities from the data
  const texasCities = useMemo(() => {
    return allLocations.filter(loc => loc.includes(", TX"));
  }, [allLocations]);

  const filteredOptions = allLocations.filter((location) =>
    location.toLowerCase().includes(searchValue.toLowerCase())
  );

  const toggleLocation = (location: string) => {
    const newLocations = value.includes(location)
      ? value.filter((l) => l !== location)
      : [...value, location];
    console.debug("LocationMultiSelect toggle", { location, prev: value, next: newLocations });
    onChange(newLocations);
  };

  const selectTexasOnly = () => {
    onChange(texasCities);
  };

  const selectAll = () => {
    onChange(allLocations);
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Location</Label>
      <Popover open={open} onOpenChange={setOpen} modal={false}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between h-10 focus:ring-2 focus:ring-primary focus:ring-offset-2"
            tabIndex={0}
          >
            {value.length === 0
              ? "Select locations..."
              : value.length === 1
              ? value[0]
              : `${value.length} locations selected`}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-80 p-0" 
          align="start"
          sideOffset={5}
          style={{ zIndex: 9999 }}
        >
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search locations..."
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList className="max-h-[400px] overflow-y-auto">
              {filteredOptions.length === 0 ? (
                <CommandEmpty>No locations found.</CommandEmpty>
              ) : (
                <CommandGroup>
                  <div className="flex flex-col gap-2 p-2 border-b">
                    <Button
                      variant="ghost"
                      size="sm"
                      type="button"
                      onClick={clearAll}
                      className="h-7 text-xs w-full"
                    >
                      Clear All
                    </Button>
                  </div>
                  {filteredOptions.map((location) => (
                    <div
                      key={location}
                      className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-within:ring-2 focus-within:ring-primary"
                      onClick={() => toggleLocation(location)}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleLocation(location);
                        }
                      }}
                    >
                      <Checkbox
                        checked={value.includes(location)}
                        onCheckedChange={() => toggleLocation(location)}
                        onClick={(e) => e.stopPropagation()}
                        className="mr-2"
                        tabIndex={-1}
                      />
                      <span className="flex-1">{location}</span>
                      {value.includes(location) && (
                        <Check className="ml-auto h-4 w-4" />
                      )}
                    </div>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}