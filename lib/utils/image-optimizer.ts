interface ImageOptimizationOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  format?: 'jpeg' | 'png' | 'webp'
  maintainAspectRatio?: boolean
}

export class ImageOptimizer {
  private static readonly DEFAULT_OPTIONS: ImageOptimizationOptions = {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 0.85,
    format: 'jpeg',
    maintainAspectRatio: true
  }

  /**
   * Compress and resize an image file
   */
  static async optimizeImage(
    file: File,
    options: ImageOptimizationOptions = {}
  ): Promise<File> {
    const config = { ...this.DEFAULT_OPTIONS, ...options }
    
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        const img = new Image()
        
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')
          
          if (!ctx) {
            reject(new Error('Failed to get canvas context'))
            return
          }
          
          // Calculate new dimensions
          const { width, height } = this.calculateDimensions(
            img.width,
            img.height,
            config.maxWidth!,
            config.maxHeight!,
            config.maintainAspectRatio!
          )
          
          // Set canvas dimensions
          canvas.width = width
          canvas.height = height
          
          // Apply image smoothing for better quality
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
          
          // Draw the resized image
          ctx.drawImage(img, 0, 0, width, height)
          
          // Convert to blob
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'))
                return
              }
              
              // Create new file with the same name
              const optimizedFile = new File(
                [blob],
                file.name,
                {
                  type: `image/${config.format}`,
                  lastModified: Date.now()
                }
              )
              
              resolve(optimizedFile)
            },
            `image/${config.format}`,
            config.quality
          )
        }
        
        img.onerror = () => {
          reject(new Error('Failed to load image'))
        }
        
        img.src = e.target?.result as string
      }
      
      reader.onerror = () => {
        reject(new Error('Failed to read file'))
      }
      
      reader.readAsDataURL(file)
    })
  }

  /**
   * Calculate optimized dimensions while maintaining aspect ratio
   */
  private static calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number,
    maintainAspectRatio: boolean
  ): { width: number; height: number } {
    if (!maintainAspectRatio) {
      return {
        width: Math.min(originalWidth, maxWidth),
        height: Math.min(originalHeight, maxHeight)
      }
    }
    
    // Check if resizing is needed
    if (originalWidth <= maxWidth && originalHeight <= maxHeight) {
      return { width: originalWidth, height: originalHeight }
    }
    
    // Calculate scaling factor
    const widthRatio = maxWidth / originalWidth
    const heightRatio = maxHeight / originalHeight
    const scaleFactor = Math.min(widthRatio, heightRatio)
    
    return {
      width: Math.round(originalWidth * scaleFactor),
      height: Math.round(originalHeight * scaleFactor)
    }
  }

  /**
   * Check if an image needs optimization based on file size and dimensions
   */
  static async needsOptimization(
    file: File,
    maxFileSize: number = 1024 * 1024, // 1MB default
    maxDimension: number = 1920
  ): Promise<boolean> {
    // Check file size
    if (file.size > maxFileSize) {
      return true
    }
    
    // Check dimensions
    return new Promise((resolve) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      
      img.onload = () => {
        URL.revokeObjectURL(url)
        const needsResize = img.width > maxDimension || img.height > maxDimension
        resolve(needsResize)
      }
      
      img.onerror = () => {
        URL.revokeObjectURL(url)
        resolve(false)
      }
      
      img.src = url
    })
  }

  /**
   * Get image dimensions from a file
   */
  static async getImageDimensions(
    file: File
  ): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      
      img.onload = () => {
        URL.revokeObjectURL(url)
        resolve({ width: img.width, height: img.height })
      }
      
      img.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('Failed to load image'))
      }
      
      img.src = url
    })
  }

  /**
   * Convert image to a different format
   */
  static async convertFormat(
    file: File,
    format: 'jpeg' | 'png' | 'webp',
    quality: number = 0.9
  ): Promise<File> {
    return this.optimizeImage(file, {
      format,
      quality,
      maxWidth: Infinity,
      maxHeight: Infinity
    })
  }
}