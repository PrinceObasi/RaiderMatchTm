
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Header } from "./Header";
import { GraduationCap, Building2, Zap, Target, Users, Award } from "lucide-react";

interface LandingPageProps {
  onStudentSignup: () => void;
  onEmployerSignup: () => void;
  onLogin: () => void;
}

export function LandingPage({ onStudentSignup, onEmployerSignup, onLogin }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100">
      <Header onLogin={onLogin} />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-red-600 p-3 rounded-full">
              <Zap className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            <span className="text-red-600">RaiderMatch</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Upload résumé, get matched
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={onStudentSignup}
              size="lg"
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 text-lg"
            >
              <GraduationCap className="mr-2 h-5 w-5" />
              I'm a Student
            </Button>
            <Button 
              onClick={onEmployerSignup}
              variant="outline"
              size="lg"
              className="border-red-600 text-red-600 hover:bg-red-50 px-8 py-3 text-lg"
            >
              <Building2 className="mr-2 h-5 w-5" />
              I'm an Employer
            </Button>
          </div>
        </div>

        {/* Features Section */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto bg-red-100 p-3 rounded-full w-fit mb-4">
                <Target className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-red-600">Smart Matching</CardTitle>
              <CardDescription>
                Get exactly 3 internship matches ranked by HireScore
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto bg-red-100 p-3 rounded-full w-fit mb-4">
                <Users className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-red-600">TTU Exclusive</CardTitle>
              <CardDescription>
                Built specifically for Texas Tech CS students
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto bg-red-100 p-3 rounded-full w-fit mb-4">
                <Award className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-red-600">One-Click Apply</CardTitle>
              <CardDescription>
                Apply to internships with a single click
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* How It Works */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-16">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">How It Works</h2>
          
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-xl font-semibold text-red-600 mb-4 flex items-center">
                <GraduationCap className="mr-2 h-5 w-5" />
                For Students
              </h3>
              <ol className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <span className="bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">1</span>
                  Upload your résumé (PDF format)
                </li>
                <li className="flex items-start">
                  <span className="bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">2</span>
                  Get 3 personalized internship matches
                </li>
                <li className="flex items-start">
                  <span className="bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">3</span>
                  Apply with one click
                </li>
              </ol>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-red-600 mb-4 flex items-center">
                <Building2 className="mr-2 h-5 w-5" />
                For Employers
              </h3>
              <ol className="space-y-3 text-gray-600">
                <li className="flex items-start">
                  <span className="bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">1</span>
                  Post your internship opportunities
                </li>
                <li className="flex items-start">
                  <span className="bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">2</span>
                  View candidates sorted by HireScore
                </li>
                <li className="flex items-start">
                  <span className="bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5">3</span>
                  Invite top candidates to interview
                </li>
              </ol>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-8">Join the Texas Tech Community</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div>
              <div className="text-3xl font-bold text-red-600">500+</div>
              <div className="text-gray-600">Students</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-red-600">50+</div>
              <div className="text-gray-600">Companies</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-red-600">200+</div>
              <div className="text-gray-600">Internships</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-red-600">85%</div>
              <div className="text-gray-600">Match Rate</div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
