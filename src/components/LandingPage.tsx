import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Header } from "./Header";
import { 
  Upload, 
  Search, 
  Target, 
  CheckCircle, 
  Building, 
  Users,
  TrendingUp,
  Star
} from "lucide-react";

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
      <section className="relative py-20 px-6">
        <div className="container mx-auto text-center max-w-4xl">
          <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
            Upload résumé,{" "}
            <span className="text-primary">get matched</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
            RaiderMatch connects Texas Tech CS students with top internship opportunities 
            through intelligent matching. Get your perfect fit in seconds.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              onClick={onStudentSignup}
              className="w-full sm:w-auto"
            >
              <Upload className="h-5 w-5" />
              Upload Résumé & Get Matched
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              onClick={onEmployerSignup}
              className="w-full sm:w-auto"
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
          <h2 className="text-3xl font-bold text-center mb-12">How RaiderMatch Works</h2>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">1. Upload Your Résumé</h3>
                <p className="text-muted-foreground">
                  Simply upload your PDF résumé and we'll analyze your skills, experience, and qualifications.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Target className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">2. Get Perfect Matches</h3>
                <p className="text-muted-foreground">
                  Our algorithm finds exactly 3 internships ranked by HireScore (0-100) based on your profile.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">3. One-Click Apply</h3>
                <p className="text-muted-foreground">
                  Apply instantly with one click. Employers see your HireScore and can invite you to interview.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto text-center">
            <div>
              <div className="text-4xl font-bold text-primary mb-2">500+</div>
              <div className="text-muted-foreground">CS Students Matched</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">50+</div>
              <div className="text-muted-foreground">Partner Companies</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-primary mb-2">85%</div>
              <div className="text-muted-foreground">Interview Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-muted">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Find Your Perfect Internship?</h2>
          <p className="text-xl mb-8 text-muted-foreground max-w-2xl mx-auto">
            Join hundreds of Texas Tech CS students who've found their dream internships through RaiderMatch.
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
            <Star className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold">RaiderMatch</span>
          </div>
          <p className="text-muted-foreground">
            Built for Texas Tech Computer Science Students
          </p>
        </div>
      </footer>
    </div>
  );
}