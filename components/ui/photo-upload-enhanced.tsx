import * as React from "react"
import { Upload, X, Image as ImageIcon, AlertCircle, CheckCircle, Loader2, FileText, Calendar, Clock } from "lucide-react"
import { cn, formatFileSize, isValidImageType, generateId } from "@/lib/utils"
import { Button } from "./button"
import { Card } from "./card"
import { Progress } from "./progress"
import { Badge } from "./badge"
import toast from "react-hot-toast"

interface UploadedFile {
  id: string
  file: File
  preview: string
  error?: string
  status?: 'idle' | 'uploading' | 'processing' | 'extracting' | 'completed' | 'failed'
  extractedData?: {
    title?: string
    date?: string
    location?: string
    confidence?: number
  }
  progress?: number
}

interface PhotoUploadEnhancedProps {
  className?: string
  maxFiles?: number
  maxFileSize?: number // in bytes
  acceptedFileTypes?: string[]
  onFilesChange?: (files: UploadedFile[]) => void
  onFileRemove?: (fileId: string) => void
  onProcessComplete?: (file: UploadedFile) => void
  disabled?: boolean
  multiple?: boolean
  showPreview?: boolean
  dropzoneText?: string
  buttonText?: string
  autoProcess?: boolean
}

const PhotoUploadEnhanced = React.forwardRef<HTMLDivElement, PhotoUploadEnhancedProps>(
  ({
    className,
    maxFiles = 10,
    maxFileSize = 5 * 1024 * 1024, // 5MB
    acceptedFileTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    onFilesChange,
    onFileRemove,
    onProcessComplete,
    disabled = false,
    multiple = true,
    showPreview = true,
    dropzoneText = "사진을 드래그하여 업로드하거나 클릭하여 선택하세요",
    buttonText = "사진 선택",
    autoProcess = true,
    ...props
  }, ref) => {
    const [files, setFiles] = React.useState<UploadedFile[]>([])
    const [isDragOver, setIsDragOver] = React.useState(false)
    const fileInputRef = React.useRef<HTMLInputElement>(null)

    const validateFile = (file: File): string | null => {
      if (!isValidImageType(file)) {
        return "지원하지 않는 파일 형식입니다. JPEG, PNG, GIF, WebP 파일만 업로드할 수 있습니다."
      }
      
      if (file.size > maxFileSize) {
        return `파일 크기가 너무 큽니다. 최대 ${formatFileSize(maxFileSize)}까지 업로드할 수 있습니다.`
      }

      if (!multiple && files.length >= 1) {
        return "한 개의 파일만 업로드할 수 있습니다."
      }

      if (files.length >= maxFiles) {
        return `최대 ${maxFiles}개의 파일만 업로드할 수 있습니다.`
      }

      return null
    }

    const simulateProcessing = async (file: UploadedFile) => {
      // 업로드 시뮬레이션
      await updateFileStatus(file.id, 'uploading', 0)
      await new Promise(resolve => setTimeout(resolve, 500))
      await updateFileStatus(file.id, 'uploading', 30)
      await new Promise(resolve => setTimeout(resolve, 500))
      await updateFileStatus(file.id, 'uploading', 60)
      await new Promise(resolve => setTimeout(resolve, 500))
      await updateFileStatus(file.id, 'uploading', 100)
      
      // OCR 처리 시뮬레이션
      await updateFileStatus(file.id, 'processing', 0)
      await new Promise(resolve => setTimeout(resolve, 800))
      await updateFileStatus(file.id, 'processing', 50)
      await new Promise(resolve => setTimeout(resolve, 800))
      await updateFileStatus(file.id, 'processing', 100)
      
      // 일정 추출 시뮬레이션
      await updateFileStatus(file.id, 'extracting', 0)
      await new Promise(resolve => setTimeout(resolve, 1000))
      await updateFileStatus(file.id, 'extracting', 100)
      
      // 완료 상태 및 추출된 데이터 시뮬레이션
      const extractedData = {
        title: '팀 회의',
        date: '2024년 12월 15일 14:00',
        location: '회의실 A',
        confidence: 0.92
      }
      
      await updateFileStatus(file.id, 'completed', 100, extractedData)
      
      toast.success(`${file.file.name}에서 일정을 성공적으로 추출했습니다!`, {
        duration: 3000,
        position: 'top-center',
      })
      
      if (onProcessComplete) {
        const updatedFile = files.find(f => f.id === file.id)
        if (updatedFile) {
          onProcessComplete(updatedFile)
        }
      }
    }

    const updateFileStatus = async (
      fileId: string, 
      status: UploadedFile['status'], 
      progress?: number,
      extractedData?: UploadedFile['extractedData']
    ) => {
      setFiles(prevFiles => 
        prevFiles.map(f => 
          f.id === fileId 
            ? { ...f, status, progress, ...(extractedData && { extractedData }) }
            : f
        )
      )
    }

    const processFiles = async (fileList: FileList) => {
      if (disabled) return

      const newFiles: UploadedFile[] = []

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i]
        const error = validateFile(file)
        
        const uploadedFile: UploadedFile = {
          id: generateId(),
          file,
          preview: URL.createObjectURL(file),
          error: error || undefined,
          status: 'idle',
          progress: 0
        }

        newFiles.push(uploadedFile)
        
        // 자동 처리 모드일 때 에러가 없으면 처리 시작
        if (autoProcess && !error) {
          setTimeout(() => simulateProcessing(uploadedFile), 100)
        }
      }

      const updatedFiles = multiple ? [...files, ...newFiles] : newFiles
      setFiles(updatedFiles)
      onFilesChange?.(updatedFiles.filter(f => !f.error))
    }

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
      const fileList = event.target.files
      if (fileList && fileList.length > 0) {
        processFiles(fileList)
      }
      // Reset input value
      event.target.value = ''
    }

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      setIsDragOver(false)
      
      const fileList = event.dataTransfer.files
      if (fileList.length > 0) {
        processFiles(fileList)
      }
    }

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      setIsDragOver(true)
    }

    const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      setIsDragOver(false)
    }

    const removeFile = (fileId: string) => {
      const fileToRemove = files.find(f => f.id === fileId)
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview)
      }
      
      const updatedFiles = files.filter(f => f.id !== fileId)
      setFiles(updatedFiles)
      onFileRemove?.(fileId)
      onFilesChange?.(updatedFiles.filter(f => !f.error))
    }

    const openFileDialog = () => {
      if (!disabled) {
        fileInputRef.current?.click()
      }
    }

    const getStatusIcon = (status: UploadedFile['status']) => {
      switch (status) {
        case 'uploading':
          return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
        case 'processing':
          return <FileText className="h-4 w-4 animate-pulse text-orange-500" />
        case 'extracting':
          return <Calendar className="h-4 w-4 animate-pulse text-purple-500" />
        case 'completed':
          return <CheckCircle className="h-4 w-4 text-green-500" />
        case 'failed':
          return <AlertCircle className="h-4 w-4 text-red-500" />
        default:
          return <Clock className="h-4 w-4 text-gray-400" />
      }
    }

    const getStatusText = (status: UploadedFile['status'], progress?: number) => {
      switch (status) {
        case 'uploading':
          return `업로드 중... ${progress || 0}%`
        case 'processing':
          return `텍스트 인식 중... ${progress || 0}%`
        case 'extracting':
          return `일정 추출 중... ${progress || 0}%`
        case 'completed':
          return '완료'
        case 'failed':
          return '실패'
        default:
          return '대기 중'
      }
    }

    const getStatusColor = (status: UploadedFile['status']) => {
      switch (status) {
        case 'uploading':
          return 'bg-blue-100 text-blue-800'
        case 'processing':
          return 'bg-orange-100 text-orange-800'
        case 'extracting':
          return 'bg-purple-100 text-purple-800'
        case 'completed':
          return 'bg-green-100 text-green-800'
        case 'failed':
          return 'bg-red-100 text-red-800'
        default:
          return 'bg-gray-100 text-gray-800'
      }
    }

    // Cleanup URLs on unmount
    React.useEffect(() => {
      return () => {
        files.forEach(file => {
          URL.revokeObjectURL(file.preview)
        })
      }
    }, [])

    return (
      <div ref={ref} className={cn("w-full", className)} data-testid="photo-upload-enhanced" {...props}>
        {/* Drop Zone */}
        <Card
          className={cn(
            "upload-dropzone relative border-2 border-dashed transition-all duration-200 cursor-pointer",
            isDragOver ? "drag-over border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50",
            disabled && "opacity-50 cursor-not-allowed",
            "p-8 text-center"
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={openFileDialog}
          data-testid="dropzone"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={acceptedFileTypes.join(',')}
            onChange={handleFileSelect}
            multiple={multiple}
            disabled={disabled}
            className="sr-only"
            data-testid="file-input"
          />
          
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center transition-colors",
              isDragOver ? "bg-primary/10" : "bg-muted"
            )}>
              <Upload className={cn(
                "w-8 h-8",
                isDragOver ? "text-primary" : "text-muted-foreground"
              )} />
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                {dropzoneText}
              </p>
              <p className="text-xs text-muted-foreground">
                {acceptedFileTypes.map(type => type.split('/')[1].toUpperCase()).join(', ')} 
                ({formatFileSize(maxFileSize)} 이하)
              </p>
            </div>
            
            <Button
              variant="outline"
              size="sm"
              disabled={disabled}
              className="pointer-events-none"
              data-testid="upload-button"
            >
              {buttonText}
            </Button>
          </div>
        </Card>

        {/* File Preview with Status */}
        {showPreview && files.length > 0 && (
          <div className="mt-6 space-y-4">
            <h3 className="text-sm font-medium text-foreground">
              처리 중인 파일 ({files.length})
            </h3>
            
            <div className="space-y-3">
              {files.map((uploadedFile) => (
                <Card
                  key={uploadedFile.id}
                  className={cn(
                    "p-4",
                    uploadedFile.error && "border-destructive"
                  )}
                  data-testid={`file-preview-${uploadedFile.id}`}
                >
                  <div className="flex items-start space-x-4">
                    {/* Thumbnail */}
                    <div className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-muted">
                      {uploadedFile.error ? (
                        <div className="w-full h-full flex items-center justify-center">
                          <AlertCircle className="w-8 h-8 text-destructive" />
                        </div>
                      ) : (
                        <img
                          src={uploadedFile.preview}
                          alt={uploadedFile.file.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    
                    {/* File Info and Status */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium truncate" title={uploadedFile.file.name}>
                            {uploadedFile.file.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatFileSize(uploadedFile.file.size)}
                          </p>
                          
                          {/* Status */}
                          {!uploadedFile.error && (
                            <div className="mt-2 space-y-2">
                              <div className="flex items-center space-x-2">
                                {getStatusIcon(uploadedFile.status)}
                                <Badge className={cn("text-xs", getStatusColor(uploadedFile.status))} variant="secondary">
                                  {getStatusText(uploadedFile.status, uploadedFile.progress)}
                                </Badge>
                              </div>
                              
                              {/* Progress Bar */}
                              {uploadedFile.status !== 'idle' && uploadedFile.status !== 'completed' && uploadedFile.status !== 'failed' && (
                                <Progress value={uploadedFile.progress || 0} className="h-1" />
                              )}
                              
                              {/* Extracted Data */}
                              {uploadedFile.extractedData && (
                                <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                  <p className="text-xs font-medium text-green-800 dark:text-green-300 mb-2">
                                    추출된 일정 정보
                                  </p>
                                  <div className="space-y-1">
                                    {uploadedFile.extractedData.title && (
                                      <p className="text-xs">
                                        <span className="text-gray-500">제목:</span> {uploadedFile.extractedData.title}
                                      </p>
                                    )}
                                    {uploadedFile.extractedData.date && (
                                      <p className="text-xs">
                                        <span className="text-gray-500">일시:</span> {uploadedFile.extractedData.date}
                                      </p>
                                    )}
                                    {uploadedFile.extractedData.location && (
                                      <p className="text-xs">
                                        <span className="text-gray-500">장소:</span> {uploadedFile.extractedData.location}
                                      </p>
                                    )}
                                    {uploadedFile.extractedData.confidence && (
                                      <p className="text-xs">
                                        <span className="text-gray-500">신뢰도:</span> {(uploadedFile.extractedData.confidence * 100).toFixed(0)}%
                                      </p>
                                    )}
                                  </div>
                                  <Button size="sm" variant="outline" className="mt-2 text-xs">
                                    캘린더에 추가
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* Error Message */}
                          {uploadedFile.error && (
                            <p className="text-xs text-destructive mt-2">
                              {uploadedFile.error}
                            </p>
                          )}
                        </div>
                        
                        {/* Remove Button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => removeFile(uploadedFile.id)}
                          data-testid={`remove-file-${uploadedFile.id}`}
                        >
                          <X className="w-4 h-4" />
                          <span className="sr-only">파일 삭제</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }
)

PhotoUploadEnhanced.displayName = "PhotoUploadEnhanced"

export { PhotoUploadEnhanced, type UploadedFile, type PhotoUploadEnhancedProps }