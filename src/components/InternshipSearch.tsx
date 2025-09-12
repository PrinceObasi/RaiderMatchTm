import React, { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SearchFilters {
  keyword: string;
}

interface InternshipSearchProps {
  onFiltersChange?: (filters: SearchFilters) => void;
  className?: string;
}

export function InternshipSearch({ onFiltersChange, className }: InternshipSearchProps) {
  const [keyword, setKeyword] = useState("");

  const handleKeywordChange = (value: string) => {
    setKeyword(value);
    onFiltersChange?.({ keyword: value });
  };

  return (
    <div className={className}>
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search companies, roles, or technologies..."
          value={keyword}
          onChange={(e) => handleKeywordChange(e.target.value)}
          className="pl-10 h-12 text-base"
        />
      </div>
    </div>
  );
}