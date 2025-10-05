import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/integrations/supabase/client"
import { toast } from "sonner"
import { Loader2, Link2, CheckCircle2, AlertCircle } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

interface ResolveResult {
  ok: boolean
  verified: number
  direct: number
  fallback: number
  total: number
  topCompanies?: Array<{
    company: string
    total: number
    direct: number
    coverage: string
  }>
  errors?: string[]
}

export function ResolveDirectLinks() {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<ResolveResult | null>(null)

  const handleResolve = async () => {
    setIsLoading(true)
    setResult(null)
    
    try {
      const { data, error } = await supabase.functions.invoke('resolve-direct-links', {
        body: { limit: 200, sinceHours: 48, dryRun: false }
      })

      if (error) {
        throw error
      }

      setResult(data)
      
      if (data.ok) {
        toast.success(
          `Resolved ${data.verified} links: ${data.direct} direct, ${data.fallback} fallback`,
          { duration: 5000 }
        )
      } else {
        toast.error(data.error || 'Resolution failed')
      }
    } catch (error: any) {
      console.error('Resolve error:', error)
      toast.error(`Failed to resolve links: ${error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Direct ATS Link Resolver
        </CardTitle>
        <CardDescription>
          Resolve Simplify redirect links to direct ATS application URLs (Greenhouse, Lever, Workday, etc.)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={handleResolve} 
          disabled={isLoading}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Resolving Links...
            </>
          ) : (
            <>
              <Link2 className="mr-2 h-4 w-4" />
              Resolve Direct Links
            </>
          )}
        </Button>

        {result && (
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-card p-4 rounded-lg border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <CheckCircle2 className="h-4 w-4" />
                  Verified
                </div>
                <div className="text-2xl font-bold">{result.verified}</div>
              </div>
              <div className="bg-card p-4 rounded-lg border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Link2 className="h-4 w-4" />
                  Direct ATS
                </div>
                <div className="text-2xl font-bold">{result.direct}</div>
              </div>
              <div className="bg-card p-4 rounded-lg border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <AlertCircle className="h-4 w-4" />
                  Fallback
                </div>
                <div className="text-2xl font-bold">{result.fallback}</div>
              </div>
            </div>

            {result.topCompanies && result.topCompanies.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Top Companies by Direct Coverage</h3>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                        <TableHead className="text-right">Direct</TableHead>
                        <TableHead className="text-right">Coverage</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.topCompanies.map((company) => (
                        <TableRow key={company.company}>
                          <TableCell className="font-medium">{company.company}</TableCell>
                          <TableCell className="text-right">{company.total}</TableCell>
                          <TableCell className="text-right">{company.direct}</TableCell>
                          <TableCell className="text-right">{company.coverage}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {result.errors && result.errors.length > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Errors ({result.errors.length})
                </h4>
                <div className="text-xs space-y-1 max-h-40 overflow-y-auto">
                  {result.errors.map((err, i) => (
                    <div key={i} className="text-muted-foreground">{err}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
