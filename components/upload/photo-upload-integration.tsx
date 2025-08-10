'use client'

import React, { useState, useCallback } from 'react'
import { PhotoUpload, type UploadedFile } from '@/components/ui/photo-upload'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, CheckCircle, Clock, Upload, Eye, Trash2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ProcessingStatus {
  id: string
  fileName: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  progress: number
  extractedText?: string
  eventsFound?: number
  errorMessage?: string
  estimatedCompletion?: string
  thumbnailUrl?: string
  events?: Array<{
    id: string
    title: string
    startDate: string
    location?: string
    confidenceScore: number
  }>
}

interface UsageInfo {
  currentUsage: number
  limit: number
  remaining: number
  resetDate: string
}

/**
 * Complete photo upload integration component
 * Combines the PhotoUpload UI with the backend upload system
 */
export function PhotoUploadIntegration() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [processingStatuses, setProcessingStatuses] = useState<Record<string, ProcessingStatus>>({})
  const [usage, setUsage] = useState<UsageInfo | null>(null)
  const { toast } = useToast()

  // Fetch current usage on component mount
  React.useEffect(() => {
    fetchUsage()
  }, [])

  const fetchUsage = async () => {
    try {
      const response = await fetch('/api/user/usage')
      if (response.ok) {
        const data = await response.json()
        setUsage(data.currentPeriod)
      }
    } catch (error) {
      console.error('Failed to fetch usage:', error)
    }
  }

  const handleFilesChange = useCallback((newFiles: UploadedFile[]) => {
    setFiles(newFiles)
  }, [])

  const handleUpload = async () => {
    if (files.length === 0) {
      toast({
        title: 'No files selected',
        description: 'Please select at least one photo to upload',
        variant: 'destructive'
      })
      return
    }

    setIsUploading(true)

    try {
      for (const uploadedFile of files) {
        await uploadSingleFile(uploadedFile)
      }

      // Clear uploaded files
      setFiles([])
      
      // Refresh usage
      await fetchUsage()

      toast({
        title: 'Upload successful',
        description: `${files.length} photo(s) uploaded and queued for processing`,
      })

    } catch (error) {
      console.error('Upload error:', error)
      toast({
        title: 'Upload failed',
        description: error.message || 'Failed to upload photos',
        variant: 'destructive'
      })
    } finally {
      setIsUploading(false)
    }
  }

  const uploadSingleFile = async (uploadedFile: UploadedFile) => {
    const formData = new FormData()
    formData.append('files', uploadedFile.file)

    const response = await fetch('/api/photo/upload', {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Upload failed')
    }

    const result = await response.json()
    
    if (result.success && result.photoExtractionId) {
      // Start polling for processing status
      startStatusPolling(result.photoExtractionId, uploadedFile.file.name)
    }
  }

  const startStatusPolling = (photoExtractionId: string, fileName: string) => {
    // Initialize processing status
    setProcessingStatuses(prev => ({
      ...prev,
      [photoExtractionId]: {
        id: photoExtractionId,
        fileName,
        status: 'PENDING',
        progress: 10
      }
    }))

    // Poll for status updates
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/photo/status/${photoExtractionId}`)
        if (response.ok) {
          const status: ProcessingStatus = await response.json()
          
          setProcessingStatuses(prev => ({
            ...prev,
            [photoExtractionId]: status
          }))

          // Stop polling if processing is complete or failed
          if (status.status === 'COMPLETED' || status.status === 'FAILED') {
            clearInterval(pollInterval)
            
            if (status.status === 'COMPLETED') {
              toast({
                title: 'Processing complete',
                description: `Found ${status.eventsFound || 0} events in ${status.fileName}`,
              })
            }
          }
        }
      } catch (error) {
        console.error('Status polling error:', error)
        clearInterval(pollInterval)
      }
    }, 5000) // Poll every 5 seconds

    // Stop polling after 5 minutes
    setTimeout(() => clearInterval(pollInterval), 5 * 60 * 1000)
  }

  const handleDeleteProcessing = async (photoExtractionId: string) => {
    try {
      const response = await fetch(`/api/photo/upload/${photoExtractionId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setProcessingStatuses(prev => {
          const newStatuses = { ...prev }
          delete newStatuses[photoExtractionId]
          return newStatuses
        })

        toast({
          title: 'Photo deleted',
          description: 'Photo and associated data have been removed',
        })
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast({
        title: 'Delete failed',
        description: 'Failed to delete photo',
        variant: 'destructive'
      })
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'PROCESSING':
        return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'FAILED':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800'
      case 'PROCESSING':
        return 'bg-blue-100 text-blue-800'
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'FAILED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Usage Information */}
      {usage && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Monthly Usage</CardTitle>
            <CardDescription>
              Track your photo upload usage for this billing period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Photos uploaded this month</span>
                <span>{usage.currentUsage} of {usage.limit}</span>
              </div>
              <Progress value={(usage.currentUsage / usage.limit) * 100} className="h-2" />
              <div className="text-xs text-muted-foreground">
                {usage.remaining} uploads remaining. Resets on {new Date(usage.resetDate).toLocaleDateString()}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Component */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Upload Photos</CardTitle>
          <CardDescription>
            Upload photos to extract calendar events using AI
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PhotoUpload
            onFilesChange={handleFilesChange}
            maxFiles={5}
            maxFileSize={5 * 1024 * 1024} // 5MB
            acceptedFileTypes={['image/jpeg', 'image/png', 'image/gif', 'image/webp']}
            disabled={isUploading || (usage?.remaining || 0) <= 0}
          />
          
          {files.length > 0 && (
            <div className="mt-4 flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {files.length} file(s) ready to upload
              </span>
              <Button 
                onClick={handleUpload} 
                disabled={isUploading || files.length === 0}
                className="flex items-center gap-2"
              >
                <Upload className="w-4 h-4" />
                {isUploading ? 'Uploading...' : 'Upload Photos'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processing Status */}
      {Object.keys(processingStatuses).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Processing Status</CardTitle>
            <CardDescription>
              Track the progress of your photo analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.values(processingStatuses).map((status) => (
                <div key={status.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(status.status)}
                      <span className="font-medium">{status.fileName}</span>
                      <Badge className={getStatusColor(status.status)}>
                        {status.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      {status.thumbnailUrl && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => window.open(status.thumbnailUrl, '_blank')}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteProcessing(status.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {status.status !== 'FAILED' && (
                    <Progress value={status.progress} className="mb-2" />
                  )}
                  
                  {status.status === 'COMPLETED' && status.eventsFound && status.eventsFound > 0 && (
                    <div className="mt-2 space-y-1">
                      <p className="text-sm text-green-600">
                        ✅ Found {status.eventsFound} calendar event(s)
                      </p>
                      {status.events && (
                        <div className="space-y-1">
                          {status.events.slice(0, 3).map((event, index) => (
                            <p key={index} className="text-xs text-muted-foreground">
                              • {event.title} - {new Date(event.startDate).toLocaleDateString()}
                              {event.location && ` at ${event.location}`}
                            </p>
                          ))}
                          {status.events && status.events.length > 3 && (
                            <p className="text-xs text-muted-foreground">
                              ... and {status.events.length - 3} more
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {status.status === 'FAILED' && status.errorMessage && (
                    <p className="text-sm text-red-600 mt-2">
                      ❌ {status.errorMessage}
                    </p>
                  )}
                  
                  {status.estimatedCompletion && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Estimated completion: {new Date(status.estimatedCompletion).toLocaleTimeString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}