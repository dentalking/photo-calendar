import * as React from "react"
import { Upload, X, Image as ImageIcon, AlertCircle, Camera, Smartphone, Loader2 } from "lucide-react"
import { cn, formatFileSize, isValidImageType, generateId } from "@/lib/utils"
import { ImageOptimizer } from "@/lib/utils/image-optimizer"
import { Button } from "./button"
import { Card } from "./card"

interface UploadedFile {
  id: string
  file: File
  preview: string
  error?: string
}

interface PhotoUploadProps {
  className?: string
  maxFiles?: number
  maxFileSize?: number // in bytes
  acceptedFileTypes?: string[]
  onFilesChange?: (files: UploadedFile[]) => void
  onFileRemove?: (fileId: string) => void
  disabled?: boolean
  multiple?: boolean
  showPreview?: boolean
  dropzoneText?: string
  buttonText?: string
  autoOptimize?: boolean
  optimizationOptions?: {
    maxWidth?: number
    maxHeight?: number
    quality?: number
  }
}

const PhotoUpload = React.forwardRef<HTMLDivElement, PhotoUploadProps>(
  ({
    className,
    maxFiles = 10,
    maxFileSize = 5 * 1024 * 1024, // 5MB
    acceptedFileTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    onFilesChange,
    onFileRemove,
    disabled = false,
    multiple = true,
    showPreview = true,
    dropzoneText = "사진을 드래그하여 업로드하거나 클릭하여 선택하세요",
    buttonText = "사진 선택",
    ...props
  }, ref) => {
    const [files, setFiles] = React.useState<UploadedFile[]>([])
    const [isDragOver, setIsDragOver] = React.useState(false)
    const [isUploading, setIsUploading] = React.useState(false)
    const [isOptimizing, setIsOptimizing] = React.useState(false)
    const [isMobile, setIsMobile] = React.useState(false)
    const fileInputRef = React.useRef<HTMLInputElement>(null)
    const cameraInputRef = React.useRef<HTMLInputElement>(null)

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

    const processFiles = async (fileList: FileList) => {
      if (disabled) return

      setIsUploading(true)
      setIsOptimizing(true)
      const newFiles: UploadedFile[] = []

      for (let i = 0; i < fileList.length; i++) {
        let file = fileList[i]
        const error = validateFile(file)
        
        const uploadedFile: UploadedFile = {
          id: generateId(),
          file,
          preview: URL.createObjectURL(file),
          error: error || undefined
        }

        newFiles.push(uploadedFile)
      }

      const updatedFiles = multiple ? [...files, ...newFiles] : newFiles
      setFiles(updatedFiles)
      setIsUploading(false)
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

    const openCameraDialog = () => {
      if (!disabled) {
        cameraInputRef.current?.click()
      }
    }

    // Detect mobile device
    React.useEffect(() => {
      const checkMobile = () => {
        setIsMobile(
          /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
          window.innerWidth <= 768
        )
      }
      checkMobile()
      window.addEventListener('resize', checkMobile)
      return () => window.removeEventListener('resize', checkMobile)
    }, [])

    // Cleanup URLs on unmount
    React.useEffect(() => {
      return () => {
        files.forEach(file => {
          URL.revokeObjectURL(file.preview)
        })
      }
    }, [])

    return (
      <div ref={ref} className={cn("w-full", className)} data-testid="photo-upload" {...props}>
        {/* Drop Zone */}
        <Card
          className={cn(
            "upload-dropzone relative border-2 border-dashed transition-all duration-200",
            isDragOver ? "drag-over border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50",
            disabled && "opacity-50 cursor-not-allowed",
            "p-4 sm:p-8 text-center",
            !isMobile && "cursor-pointer"
          )}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={!isMobile ? openFileDialog : undefined}
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
          
          {/* Camera Input - Direct camera capture on mobile */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileSelect}
            disabled={disabled}
            className="sr-only"
            data-testid="camera-input"
          />
          
          <div className="flex flex-col items-center justify-center space-y-3 sm:space-y-4">
            <div className={cn(
              "w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center transition-colors",
              isDragOver ? "bg-primary/10" : "bg-muted"
            )}>
              {isMobile ? (
                <Camera className={cn(
                  "w-6 h-6 sm:w-8 sm:h-8",
                  isDragOver ? "text-primary" : "text-muted-foreground"
                )} />
              ) : (
                <Upload className={cn(
                  "w-6 h-6 sm:w-8 sm:h-8",
                  isDragOver ? "text-primary" : "text-muted-foreground"
                )} />
              )}
            </div>
            
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground px-2">
                {isMobile ? "사진을 선택하거나 촬영하세요" : dropzoneText}
              </p>
              <p className="text-xs text-muted-foreground">
                {acceptedFileTypes.map(type => type.split('/')[1].toUpperCase()).join(', ')} 
                ({formatFileSize(maxFileSize)} 이하)
              </p>
            </div>
            
            {/* Button Container - Responsive Layout */}
            <div className="flex flex-col sm:flex-row gap-2 w-full px-4 sm:px-0 sm:w-auto">
              {isMobile ? (
                <>
                  {/* Camera Button - Primary on mobile */}
                  <Button
                    variant="default"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      openCameraDialog()
                    }}
                    disabled={disabled || isUploading}
                    className="w-full sm:w-auto"
                    data-testid="camera-button"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    카메라 촬영
                  </Button>
                  
                  {/* Gallery Button - Secondary on mobile */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      openFileDialog()
                    }}
                    disabled={disabled || isUploading}
                    className="w-full sm:w-auto"
                    data-testid="gallery-button"
                  >
                    <ImageIcon className="h-4 w-4 mr-2" />
                    갤러리에서 선택
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={disabled || isUploading}
                  className="pointer-events-none"
                  data-testid="upload-button"
                >
                  {isUploading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
                      업로드 중...
                    </div>
                  ) : (
                    buttonText
                  )}
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* File Preview */}
        {showPreview && files.length > 0 && (
          <div className="mt-6 space-y-4">
            <h3 className="text-sm font-medium text-foreground">
              업로드된 파일 ({files.length})
            </h3>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4">
              {files.map((uploadedFile) => (
                <Card
                  key={uploadedFile.id}
                  className={cn(
                    "relative group overflow-hidden",
                    uploadedFile.error && "border-destructive"
                  )}
                  data-testid={`file-preview-${uploadedFile.id}`}
                >
                  <div className="aspect-square relative bg-muted">
                    {uploadedFile.error ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
                        <AlertCircle className="w-8 h-8 text-destructive mb-2" />
                        <p className="text-xs text-destructive">{uploadedFile.error}</p>
                      </div>
                    ) : (
                      <img
                        src={uploadedFile.preview}
                        alt={uploadedFile.file.name}
                        className="w-full h-full object-cover"
                        onLoad={() => URL.revokeObjectURL(uploadedFile.preview)}
                      />
                    )}
                  </div>
                  
                  <div className="p-2 sm:p-3 space-y-1 sm:space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium truncate" title={uploadedFile.file.name}>
                          {uploadedFile.file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(uploadedFile.file.size)}
                        </p>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 sm:h-8 sm:w-8 shrink-0"
                        onClick={() => removeFile(uploadedFile.id)}
                        data-testid={`remove-file-${uploadedFile.id}`}
                      >
                        <X className="w-3 h-3 sm:w-4 sm:h-4" />
                        <span className="sr-only">파일 삭제</span>
                      </Button>
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

PhotoUpload.displayName = "PhotoUpload"

export { PhotoUpload, type UploadedFile, type PhotoUploadProps }