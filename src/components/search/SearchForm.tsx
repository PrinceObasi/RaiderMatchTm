import React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Search, RotateCcw, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LocationMultiSelect } from "./filters/LocationMultiSelect";
import { TechStackMultiSelect } from "./filters/TechStackMultiSelect";
import { FilterSchema, FilterFormData } from "./types";

interface SearchFormProps {
  onApply: (data: FilterFormData) => void;
  onReset: () => void;
  defaultValues?: Partial<FilterFormData>;
  isLoading?: boolean;
}

export function SearchForm({ onApply, onReset, defaultValues, isLoading }: SearchFormProps) {
  const form = useForm<FilterFormData>({
    resolver: zodResolver(FilterSchema),
    defaultValues: {
      q: '',
      locations: [],
      visa: 'any',
      stacks: [],
      ...defaultValues,
    },
  });

  const { handleSubmit, control, reset, watch, getValues } = form;

  const handleReset = () => {
    reset({
      q: '',
      locations: [],
      visa: 'any',
      stacks: [],
    });
    onReset();
  };

  const onSubmit = (data: FilterFormData) => {
    console.debug("SearchForm submit", data);
    onApply(data);
  };

  // Watch values for active filter count
  const watchedValues = watch();
  const activeFilters = [
    watchedValues.q?.length,
    watchedValues.locations?.length,
    watchedValues.visa !== 'any',
    watchedValues.stacks?.length,
  ].filter(Boolean).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Search & Filter
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Search Input */}
          <div className="space-y-2">
            <Label htmlFor="search-input" className="text-sm font-medium">
              Search
            </Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Controller
                name="q"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="search-input"
                    placeholder="Search companies, roles, technologies..."
                    className="pl-10 focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    value={field.value || ''}
                  />
                )}
              />
            </div>
          </div>

          {/* Location Filter */}
          <Controller
            name="locations"
            control={control}
            render={({ field }) => (
              <LocationMultiSelect
                value={field.value || []}
                onChange={field.onChange}
                name={field.name}
              />
            )}
          />

          {/* Visa Sponsorship Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Visa Sponsorship</Label>
            <Controller
              name="visa"
              control={control}
              render={({ field }) => (
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
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
              )}
            />
          </div>

          {/* Tech Stack Filter */}
          <Controller
            name="stacks"
            control={control}
            render={({ field }) => (
              <TechStackMultiSelect
                value={field.value || []}
                onChange={field.onChange}
                name={field.name}
              />
            )}
          />

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button 
              type="submit" 
              className="flex-1"
              disabled={isLoading}
            >
              <Search className="h-4 w-4 mr-2" />
              {isLoading ? 'Searching...' : 'Apply Filters'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={isLoading || activeFilters === 0}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>

          {activeFilters > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              {activeFilters} filter{activeFilters !== 1 ? 's' : ''} active
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}