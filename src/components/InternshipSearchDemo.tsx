import React, { useState } from "react";
import { InternshipSearch } from "./InternshipSearch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SearchFilters {
  keyword: string;
}

// Mock internships data for demo
const mockInternships = [
  {
    id: 1,
    company: "Microsoft",
    title: "Software Engineering Intern",
    location: "Austin",
    techStack: ["C#", "Azure", "React", "TypeScript"],
    sponsorsVisa: true,
    gpaRequirement: 3.0,
  },
  {
    id: 2,
    company: "Google",
    title: "Frontend Developer Intern",
    location: "Remote",
    techStack: ["JavaScript", "React", "Node.js", "Python"],
    sponsorsVisa: true,
    gpaRequirement: 3.5,
  },
  {
    id: 3,
    company: "Meta",
    title: "Data Science Intern",
    location: "Dallas",
    techStack: ["Python", "TensorFlow", "SQL", "R"],
    sponsorsVisa: false,
    gpaRequirement: 3.2,
  },
  {
    id: 4,
    company: "Apple",
    title: "iOS Developer Intern",
    location: "Houston",
    techStack: ["Swift", "Xcode", "iOS", "Objective-C"],
    sponsorsVisa: true,
    gpaRequirement: 3.3,
  },
  {
    id: 5,
    company: "Amazon",
    title: "Cloud Engineer Intern",
    location: "Austin",
    techStack: ["AWS", "Python", "Docker", "Kubernetes"],
    sponsorsVisa: true,
    gpaRequirement: 2.8,
  },
];

export function InternshipSearchDemo() {
  const [filters, setFilters] = useState<SearchFilters>({
    keyword: "",
  });

  const [filteredInternships, setFilteredInternships] = useState(mockInternships);

  const handleFiltersChange = (newFilters: SearchFilters) => {
    setFilters(newFilters);

    // Apply keyword search to mock data
    let filtered = mockInternships.filter((internship) => {
      // Keyword search
      if (newFilters.keyword) {
        const keyword = newFilters.keyword.toLowerCase();
        const searchText = `${internship.company} ${internship.title} ${internship.techStack.join(" ")}`.toLowerCase();
        if (!searchText.includes(keyword)) return false;
      }

      return true;
    });

    setFilteredInternships(filtered);
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Internship Search</h1>
          <p className="text-muted-foreground">
            Find your perfect internship with advanced filters and search
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Search and Filters */}
          <div className="lg:col-span-1">
            <InternshipSearch
              onFiltersChange={handleFiltersChange}
              className="sticky top-4"
            />
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {filteredInternships.length} Internships Found
              </h2>
              <p className="text-sm text-muted-foreground">
                Showing results for your filters
              </p>
            </div>

            <div className="space-y-4">
              {filteredInternships.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground mb-4">
                      No internships match your current filters.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Try adjusting your search criteria or clearing some filters.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredInternships.map((internship) => (
                  <Card key={internship.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{internship.title}</CardTitle>
                          <p className="text-primary font-medium">{internship.company}</p>
                          <p className="text-sm text-muted-foreground">
                            📍 {internship.location} • 
                            {internship.sponsorsVisa ? " ✅ Sponsors Visa" : " ❌ No Visa"} • 
                            GPA: {internship.gpaRequirement}+
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {internship.techStack.map((tech) => (
                          <Badge
                            key={tech}
                            variant="outline"
                            className="text-xs"
                          >
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}