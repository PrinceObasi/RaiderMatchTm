import React from 'react';
import { Button } from '@/components/ui/button';
import { TriggerSimplifyDiscovery } from './TriggerSimplifyDiscovery';
import { ArrowLeft } from 'lucide-react';

interface TriggerScraperProps {
  onBack?: () => void;
}

export const TriggerScraper = ({ onBack }: TriggerScraperProps) => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {onBack && (
        <Button 
          onClick={onBack} 
          variant="ghost" 
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      )}
      
      <h1 className="text-3xl font-bold mb-6">Data Scraper</h1>
      
      <div className="max-w-2xl">
        <TriggerSimplifyDiscovery />
      </div>
    </div>
  );
};