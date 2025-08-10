import * as React from "react"
import { Upload, X, Image as ImageIcon, AlertCircle } from "lucide-react"
import { cn, formatFileSize, isValidImageType, generateId } from "@/lib/utils"
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

    const processFiles = async (fileList: FileList) => {
      if (disabled) return

      setIsUploading(true)
      const newFiles: UploadedFile[] = []

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i]
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
          </div>
        </Card>

        {/* File Preview */}
        {showPreview && files.length > 0 && (
          <div className="mt-6 space-y-4">
            <h3 className="text-sm font-medium text-foreground">
              업로드된 파일 ({files.length})
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                  
                  <div className="p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate" title={uploadedFile.file.name}>
                          {uploadedFile.file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(uploadedFile.file.size)}
                        </p>
                      </div>
                      
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