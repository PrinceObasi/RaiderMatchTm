import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Form, FormControl, FormField, FormItem } from "@/components/ui/form";
import { LocationFilter } from "./filters/LocationFilter";
import { VisaSponsorshipFilter } from "./filters/VisaSponsorshipFilter";
import { TechStackFilter } from "./filters/TechStackFilter";
import { SearchFiltersSchema, SearchFilters } from "@/lib/searchSchema";

interface InternshipSearchProps {
  onFiltersChange?: (filters: SearchFilters) => void;
  className?: string;
}

export function InternshipSearch({ onFiltersChange, className }: InternshipSearchProps) {
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const form = useForm<SearchFilters>({
    resolver: zodResolver(SearchFiltersSchema),
    defaultValues: {
      q: "",
      locations: [],
      visa: "any",
      stacks: [],
      respectGpa: false
    }
  });

  const { watch, setValue, reset } = form;
  const watchedValues = watch();

  // Remove the automatic onChange trigger since we now use Apply button
  // useEffect(() => {
  //   onFiltersChange?.(watchedValues);
  // }, [watchedValues, onFiltersChange]);

  const clearAllFilters = () => {
    reset({
      q: "",
      locations: [],
      visa: "any",
      stacks: [],
      respectGpa: false
    });
    // Trigger search immediately after reset
    onFiltersChange?.({
      q: "",
      locations: [],
      visa: "any",
      stacks: [],
      respectGpa: false
    });
  };

  const handleApplyFilters = () => {
    // Trigger search with current form values
    onFiltersChange?.(watchedValues);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (watchedValues.q) count++;
    if (watchedValues.locations && watchedValues.locations.length > 0) count++;
    if (watchedValues.visa !== "any") count++;
    if (watchedValues.stacks && watchedValues.stacks.length > 0) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  const FiltersContent = () => (
    <div className="space-y-6">
      <LocationFilter
        value={watchedValues.locations || []}
        onChange={(locations) => setValue("locations", locations)}
      />
      
      <VisaSponsorshipFilter
        value={watchedValues.visa || "any"}
        onChange={(visa) => setValue("visa", visa)}
      />
      
      <TechStackFilter
        value={watchedValues.stacks || []}
        onChange={(stacks) => setValue("stacks", stacks)}
      />

      {/* Apply and Reset Buttons */}
      <div className="flex gap-2">
        <Button 
          onClick={handleApplyFilters}
          className="flex-1"
        >
          Apply Filters
        </Button>
        
        {activeFiltersCount > 0 && (
          <Button
            variant="outline"
            onClick={clearAllFilters}
            className="flex-1"
          >
            Reset
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Form {...form}>
      <div className={className}>
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <FormField
            control={form.control}
            name="q"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="Search companies, roles, or technologies..."
                    className="pl-10 h-12 text-base"
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* Active Filters Display */}
        {activeFiltersCount > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {watchedValues.q && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Keyword: {watchedValues.q}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => {
                    setValue("q", "");
                    handleApplyFilters();
                  }}
                />
              </Badge>
            )}
            
            {(watchedValues.locations || []).map((location) => (
              <Badge key={location} variant="secondary" className="flex items-center gap-1">
                {location}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => {
                    setValue("locations", (watchedValues.locations || []).filter((l) => l !== location));
                    handleApplyFilters();
                  }}
                />
              </Badge>
            ))}
            
            {watchedValues.visa !== "any" && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Visa: {watchedValues.visa === "yes" ? "Required" : "Not Required"}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => {
                    setValue("visa", "any");
                    handleApplyFilters();
                  }}
                />
              </Badge>
            )}
            
            {(watchedValues.stacks || []).map((tech) => (
              <Badge key={tech} variant="secondary" className="flex items-center gap-1">
                {tech}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => {
                    setValue("stacks", (watchedValues.stacks || []).filter((t) => t !== tech));
                    handleApplyFilters();
                  }}
                />
              </Badge>
            ))}
          </div>
        )}

      {/* Desktop Filters */}
      <Card className="hidden lg:block">
        <CardContent className="p-6">
          <FiltersContent />
        </CardContent>
      </Card>

      {/* Mobile Filters */}
      <div className="lg:hidden">
        <Sheet open={isMobileFiltersOpen} onOpenChange={setIsMobileFiltersOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" className="w-full mb-4">
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge variant="destructive" className="ml-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Filter Internships</SheetTitle>
            </SheetHeader>
            <div className="mt-6">
              <FiltersContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
    </Form>
  );
}