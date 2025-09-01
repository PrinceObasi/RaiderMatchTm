import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Upload, FileSpreadsheet, ArrowLeft, Check, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface AdminImportProps {
  onBack: () => void
}

interface ImportResult {
  total: number
  inserted: number
  updated: number
  errors?: number
}

interface NormalizedRow {
  company: string
  role_title: string
  category?: string
  location?: string
  is_texas: boolean
  sponsorship_flag: string
  employment_type: string
  apply_url?: string
  source_url?: string
  date_posted?: string
}

export function AdminImport({ onBack }: AdminImportProps) {
  const [adminKey, setAdminKey] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [sampleData, setSampleData] = useState<NormalizedRow[]>([])
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (isValidFileType(droppedFile)) {
        setFile(droppedFile)
        setError(null)
      } else {
        setError('Please upload a CSV or XLSX file')
      }
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0]
      if (isValidFileType(selectedFile)) {
        setFile(selectedFile)
        setError(null)
      } else {
        setError('Please upload a CSV or XLSX file')
        e.target.value = ''
      }
    }
  }

  const isValidFileType = (file: File): boolean => {
    const validTypes = [
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ]
    const validExtensions = ['.csv', '.xlsx', '.xls']
    
    return validTypes.includes(file.type) || 
           validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!adminKey.trim()) {
      setError('Admin key is required')
      return
    }
    
    if (!file) {
      setError('Please select a file to upload')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)
    setSampleData([])

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('https://tjahvypvfrjulnqmnhsh.supabase.co/functions/v1/import-internships', {
        method: 'POST',
        headers: {
          'x-admin-key': adminKey.trim()
        },
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}`)
      }

      setResult(data)
      
      // Mock sample data - in a real implementation, the backend would return this
      setSampleData([
        {
          company: 'Example Corp',
          role_title: 'Software Engineering Intern',
          category: 'Technology',
          location: 'Austin, TX',
          is_texas: true,
          sponsorship_flag: 'cpt_opt_ok',
          employment_type: 'internship',
          apply_url: 'https://example.com/apply',
          source_url: 'https://example.com/job',
          date_posted: '2024-01-15'
        }
      ])

      toast({
        title: 'Import successful!',
        description: `Processed ${data.total} rows successfully.`
      })

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
      toast({
        title: 'Import failed',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={onBack} className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Admin Import</h1>
            <p className="text-muted-foreground">Import internship data from CSV or XLSX files</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Admin Key Input */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>Authentication</span>
              </CardTitle>
              <CardDescription>
                Enter the admin key to authenticate the import operation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="adminKey">Admin Key</Label>
                <Input
                  id="adminKey"
                  type="password"
                  value={adminKey}
                  onChange={(e) => setAdminKey(e.target.value)}
                  placeholder="Enter admin key..."
                  className="font-mono"
                />
              </div>
            </CardContent>
          </Card>

          {/* File Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                File Upload
              </CardTitle>
              <CardDescription>
                Upload a CSV or XLSX file containing internship data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-primary bg-primary/5'
                    : file
                    ? 'border-green-500 bg-green-50 dark:bg-green-950/20'
                    : 'border-muted-foreground/25 hover:border-primary/50'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {file ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center">
                      <FileSpreadsheet className="h-12 w-12 text-green-500" />
                    </div>
                    <div>
                      <p className="font-medium text-green-700 dark:text-green-300">
                        {file.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setFile(null)
                        if (fileInputRef.current) {
                          fileInputRef.current.value = ''
                        }
                      }}
                    >
                      Remove file
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-center">
                      <Upload className="h-12 w-12 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-lg font-medium">
                        Drag and drop your file here, or{' '}
                        <Button
                          type="button"
                          variant="link"
                          className="p-0 h-auto font-medium"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          browse
                        </Button>
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Supports CSV and XLSX files
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <X className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            size="lg"
            disabled={loading || !adminKey.trim() || !file}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Import Internships
              </>
            )}
          </Button>
        </form>

        {/* Results */}
        {result && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Check className="h-5 w-5 text-green-500" />
                Import Results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{result.total}</div>
                  <div className="text-sm text-muted-foreground">Total Rows</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{result.inserted}</div>
                  <div className="text-sm text-muted-foreground">Processed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{result.updated || 0}</div>
                  <div className="text-sm text-muted-foreground">Updated</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{result.errors || 0}</div>
                  <div className="text-sm text-muted-foreground">Errors</div>
                </div>
              </div>

              {sampleData.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium mb-3">Sample Normalized Data (First 5 rows):</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border rounded">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-2 text-left border">Company</th>
                          <th className="p-2 text-left border">Role</th>
                          <th className="p-2 text-left border">Location</th>
                          <th className="p-2 text-left border">TX</th>
                          <th className="p-2 text-left border">Sponsorship</th>
                          <th className="p-2 text-left border">Apply URL</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sampleData.slice(0, 5).map((row, index) => (
                          <tr key={index} className="border-t">
                            <td className="p-2 border">{row.company}</td>
                            <td className="p-2 border">{row.role_title}</td>
                            <td className="p-2 border">{row.location || '-'}</td>
                            <td className="p-2 border">
                              {row.is_texas ? (
                                <Check className="h-4 w-4 text-green-500" />
                              ) : (
                                <X className="h-4 w-4 text-red-500" />
                              )}
                            </td>
                            <td className="p-2 border">{row.sponsorship_flag}</td>
                            <td className="p-2 border">
                              {row.apply_url ? (
                                <a
                                  href={row.apply_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:underline truncate block max-w-[200px]"
                                >
                                  {row.apply_url}
                                </a>
                              ) : (
                                '-'
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}