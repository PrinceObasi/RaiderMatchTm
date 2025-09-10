import React, { useState } from "react";
import { Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { LocationFilter } from "./filters/LocationFilter";
import { VisaSponsorshipFilter } from "./filters/VisaSponsorshipFilter";
import { GPAFilter } from "./filters/GPAFilter";
import { TechStackFilter } from "./filters/TechStackFilter";

interface SearchFilters {
  keyword: string;
  locations: string[];
  visaSponsorship: "any" | "yes" | "no";
  gpaMinimum: number;
  techStack: string[];
}

interface InternshipSearchProps {
  onFiltersChange?: (filters: SearchFilters) => void;
  className?: string;
}

export function InternshipSearch({ onFiltersChange, className }: InternshipSearchProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    keyword: "",
    locations: [],
    visaSponsorship: "any",
    gpaMinimum: 0,
    techStack: [],
  });

  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  const updateFilters = (newFilters: Partial<SearchFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFiltersChange?.(updatedFilters);
  };

  const clearAllFilters = () => {
    const clearedFilters: SearchFilters = {
      keyword: "",
      locations: [],
      visaSponsorship: "any",
      gpaMinimum: 0,
      techStack: [],
    };
    setFilters(clearedFilters);
    onFiltersChange?.(clearedFilters);
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (filters.keyword) count++;
    if (filters.locations.length > 0) count++;
    if (filters.visaSponsorship !== "any") count++;
    if (filters.gpaMinimum > 0) count++;
    if (filters.techStack.length > 0) count++;
    return count;
  };

  const activeFiltersCount = getActiveFiltersCount();

  const FiltersContent = () => (
    <div className="space-y-6">
      <LocationFilter
        value={filters.locations}
        onChange={(locations) => updateFilters({ locations })}
      />
      
      <VisaSponsorshipFilter
        value={filters.visaSponsorship}
        onChange={(visaSponsorship) => updateFilters({ visaSponsorship })}
      />
      
      <GPAFilter
        value={filters.gpaMinimum}
        onChange={(gpaMinimum) => updateFilters({ gpaMinimum })}
      />
      
      <TechStackFilter
        value={filters.techStack}
        onChange={(techStack) => updateFilters({ techStack })}
      />

      {activeFiltersCount > 0 && (
        <Button
          variant="outline"
          onClick={clearAllFilters}
          className="w-full"
        >
          <X className="h-4 w-4 mr-2" />
          Clear All Filters
        </Button>
      )}
    </div>
  );

  return (
    <div className={className}>
      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search companies, roles, or technologies..."
          value={filters.keyword}
          onChange={(e) => updateFilters({ keyword: e.target.value })}
          className="pl-10 h-12 text-base"
        />
      </div>

      {/* Active Filters Display */}
      {activeFiltersCount > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {filters.keyword && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Keyword: {filters.keyword}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilters({ keyword: "" })}
              />
            </Badge>
          )}
          
          {filters.locations.map((location) => (
            <Badge key={location} variant="secondary" className="flex items-center gap-1">
              {location}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() =>
                  updateFilters({
                    locations: filters.locations.filter((l) => l !== location),
                  })
                }
              />
            </Badge>
          ))}
          
          {filters.visaSponsorship !== "any" && (
            <Badge variant="secondary" className="flex items-center gap-1">
              Visa: {filters.visaSponsorship === "yes" ? "Required" : "Not Required"}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilters({ visaSponsorship: "any" })}
              />
            </Badge>
          )}
          
          {filters.gpaMinimum > 0 && (
            <Badge variant="secondary" className="flex items-center gap-1">
              GPA: {filters.gpaMinimum.toFixed(1)}+
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => updateFilters({ gpaMinimum: 0 })}
              />
            </Badge>
          )}
          
          {filters.techStack.map((tech) => (
            <Badge key={tech} variant="secondary" className="flex items-center gap-1">
              {tech}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() =>
                  updateFilters({
                    techStack: filters.techStack.filter((t) => t !== tech),
                  })
                }
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
  );
}