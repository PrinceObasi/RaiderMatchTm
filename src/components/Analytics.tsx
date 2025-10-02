import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function Analytics() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Application Analytics</h2>
        <p className="text-muted-foreground">
          Track which roles and companies are most popular with students
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Analytics Not Available</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Feature Disabled</AlertTitle>
            <AlertDescription>
              Application analytics tracking has been disabled. The tracking tables have been removed from the database.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
