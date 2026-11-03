import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "./Header";
import {
  Upload,
  Target,
  ClipboardList,
  Building,
  GraduationCap,
} from "lucide-react";

// Counts from the production database on Nov 2, 2026 (631 active internships,
// 330 companies; Simplify sync runs every 4 hours). Round down, never up.
const STATS = [
  { value: "600+", label: "Open internships right now" },
  { value: "300+", label: "Companies hiring" },
  { value: "Every 4 hrs", label: "New postings synced automatically" },
];

interface LandingPageProps {
  onStudentSignup: () => void;
  onEmployerSignup: () => void;
  onLogin: () => void;
}

export function LandingPage({ onStudentSignup, onEmployerSignup, onLogin }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-background">
      <Header 
        onStudentSignup={onStudentSignup} 
        onEmployerSignup={onEmployerSignup} 
        onLogin={onLogin} 
      />
      
      {/* Hero Section */}
      <section className="container mx-auto px-4 sm:px-6 py-10 sm:py-16">
        <div className="text-center max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-6xl font-extrabold leading-tight text-balance mb-6">
            Upload résumé, <span className="text-primary">get matched</span>
          </h1>
          <p className="mt-3 sm:mt-4 max-w-prose text-balance text-base sm:text-lg text-muted-foreground mb-8 mx-auto">
            RaiderMatch™ ranks open internships by how well they fit your résumé, built for Texas Tech CS students.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              size="lg" 
              onClick={onStudentSignup}
              className="w-full sm:w-auto h-11"
            >
              <Upload className="h-5 w-5" />
              Upload Résumé & Get Matched
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              onClick={onEmployerSignup}
              className="w-full sm:w-auto h-11"
            >
              <Building className="h-5 w-5" />
              Post Internships
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">How RaiderMatch™ Works</h2>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">1. Upload Your Résumé</h3>
                <p className="text-muted-foreground">
                  Upload a PDF and we pull your skills out of it automatically.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">2. Get Ranked Matches</h3>
                <p className="text-muted-foreground">
                  We score open roles on your skills, GPA, experience, and projects, and show which skills you match and which you're missing.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ClipboardList className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">3. Apply and Track</h3>
                <p className="text-muted-foreground">
                  Apply on the company's site, then track every application's stage, deadline, and notes in one place.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <dl className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto text-center">
            {STATS.map((stat) => (
              <div key={stat.label} className="flex flex-col-reverse">
                <dt className="text-muted-foreground">{stat.label}</dt>
                <dd className="text-4xl font-bold text-primary mb-2">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-muted">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Find Your Internship?</h2>
          <p className="text-xl mb-8 text-muted-foreground max-w-2xl mx-auto">
            Upload your résumé and see which open roles fit you best.
          </p>
          <Button 
            size="lg" 
            onClick={onStudentSignup}
          >
            <Upload className="h-5 w-5" />
            Start Matching Now
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t">
        <div className="container mx-auto px-6 text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <GraduationCap className="h-6 w-6 text-primary" aria-hidden="true" />
            <span className="text-lg font-bold text-primary">RaiderMatch<span className="align-super text-[0.6em] ml-0.5">™</span></span>
          </div>
          <p className="text-muted-foreground">
            Built for Texas Tech Computer Science Students
          </p>
        </div>
      </footer>
    </div>
  );
}