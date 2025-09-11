import React, { useState, useRef, useEffect } from 'react';
import { Code2, ChevronDown, Check } from 'lucide-react';

interface TechStackFilterProps {
  selectedTechStack: string[];
  onChange: (techStack: string[]) => void;
  disabled?: boolean;
}

// Common tech stack options based on typical internship requirements
const TECH_STACK_OPTIONS = [
  "Software Engineering",
  "Data Science",
  "Machine Learning",
  "Web Development",
  "Mobile Development",
  "Cloud Computing",
  "DevOps",
  "Cybersecurity",
  "UI/UX Design",
  "Product Management",
  "Python",
  "JavaScript",
  "Java",
  "C++",
  "React",
  "Node.js",
  "AWS",
  "Docker",
  "Kubernetes",
  "SQL"
];

const TechStackFilter: React.FC<TechStackFilterProps> = ({ 
  selectedTechStack, 
  onChange,
  disabled = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTechStack = (tech: string) => {
    console.log('[TechStackFilter] Toggling tech:', tech);
    const newTechStack = selectedTechStack.includes(tech)
      ? selectedTechStack.filter(t => t !== tech)
      : [...selectedTechStack, tech];
    
    console.log('[TechStackFilter] New tech stack:', newTechStack);
    onChange(newTechStack);
  };

  const clearAll = () => {
    console.log('[TechStackFilter] Clearing all tech stack');
    onChange([]);
    setIsOpen(false);
    setSearchTerm('');
  };

  // Filter options based on search term
  const filteredOptions = TECH_STACK_OPTIONS.filter(tech =>
    tech.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          flex items-center gap-2 px-4 py-2 border rounded-lg
          ${disabled 
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
            : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300'}
          ${selectedTechStack.length > 0 ? 'ring-2 ring-blue-500 border-blue-500' : ''}
        `}
      >
        <Code2 className="h-4 w-4" />
        <span>
          {selectedTechStack.length === 0 
            ? 'Tech Stack' 
            : `${selectedTechStack.length} selected`}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg">
          {/* Search Input */}
          <div className="p-2 border-b border-gray-200">
            <input
              type="text"
              placeholder="Search tech stack..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Clear All Button */}
          {selectedTechStack.length > 0 && (
            <div className="p-2 border-b border-gray-200">
              <button
                onClick={clearAll}
                className="text-sm text-gray-600 hover:text-gray-700 font-medium"
              >
                Clear All ({selectedTechStack.length})
              </button>
            </div>
          )}

          {/* Tech Stack Options */}
          <div className="max-h-64 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-sm text-gray-500 text-center">
                No matching tech stack found
              </div>
            ) : (
              filteredOptions.map(tech => (
                <label
                  key={tech}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedTechStack.includes(tech)}
                    onChange={() => toggleTechStack(tech)}
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 flex-1">{tech}</span>
                  {selectedTechStack.includes(tech) && (
                    <Check className="h-4 w-4 text-blue-600" />
                  )}
                </label>
              ))
            )}
          </div>

          {/* Selected Count */}
          {selectedTechStack.length > 0 && (
            <div className="p-2 border-t border-gray-200 bg-gray-50">
              <div className="flex flex-wrap gap-1">
                {selectedTechStack.slice(0, 3).map(tech => (
                  <span key={tech} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                    {tech}
                  </span>
                ))}
                {selectedTechStack.length > 3 && (
                  <span className="text-xs text-gray-600 px-2 py-1">
                    +{selectedTechStack.length - 3} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TechStackFilter;