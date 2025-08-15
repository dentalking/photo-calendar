import * as React from "react"
import { cn } from "@/lib/utils"
import { Upload, FileText, Brain, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { Card } from "./card"

type ProcessingStep = 'upload' | 'ocr' | 'analysis' | 'complete' | 'error'

interface LoadingIndicatorProps {
  currentStep: ProcessingStep
  fileName?: string
  progress?: number
  error?: string
  className?: string
}

const steps = [
  { id: 'upload', label: '업로드 중', icon: Upload },
  { id: 'ocr', label: '텍스트 추출 중', icon: FileText },
  { id: 'analysis', label: 'AI 분석 중', icon: Brain },
]

export function LoadingIndicator({
  currentStep,
  fileName,
  progress,
  error,
  className
}: LoadingIndicatorProps) {
  const getStepStatus = (stepId: string) => {
    const stepOrder = ['upload', 'ocr', 'analysis']
    const currentIndex = stepOrder.indexOf(currentStep)
    const stepIndex = stepOrder.indexOf(stepId)
    
    if (currentStep === 'error') return 'error'
    if (currentStep === 'complete') return 'complete'
    if (stepIndex < currentIndex) return 'complete'
    if (stepIndex === currentIndex) return 'active'
    return 'pending'
  }

  return (
    <Card className={cn("p-4 sm:p-6", className)}>
      <div className="space-y-4">
        {fileName && (
          <div className="text-center">
            <p className="text-sm font-medium text-foreground truncate">
              {fileName}
            </p>
          </div>
        )}

        {/* Progress Steps */}
        <div className="flex items-center justify-between relative">
          {/* Progress Line */}
          <div className="absolute left-0 right-0 top-5 h-0.5 bg-muted">
            <div 
              className="h-full bg-primary transition-all duration-500"
              style={{
                width: currentStep === 'complete' ? '100%' : 
                       currentStep === 'analysis' ? '66%' :
                       currentStep === 'ocr' ? '33%' :
                       currentStep === 'upload' ? '10%' : '0%'
              }}
            />
          </div>

          {/* Step Indicators */}
          {steps.map((step, index) => {
            const status = getStepStatus(step.id)
            const Icon = step.icon
            
            return (
              <div key={step.id} className="relative z-10 flex flex-col items-center">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                    status === 'complete' && "bg-green-500 text-white",
                    status === 'active' && "bg-primary text-primary-foreground animate-pulse",
                    status === 'pending' && "bg-muted text-muted-foreground",
                    status === 'error' && "bg-destructive text-destructive-foreground"
                  )}
                >
                  {status === 'complete' ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : status === 'active' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : status === 'error' ? (
                    <AlertCircle className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <span className={cn(
                  "text-xs mt-2 whitespace-nowrap",
                  status === 'active' && "font-medium",
                  status === 'pending' && "text-muted-foreground"
                )}>
                  {step.label}
                </span>
              </div>
            )
          })}
        </div>

        {/* Progress Bar (if provided) */}
        {progress !== undefined && currentStep !== 'complete' && currentStep !== 'error' && (
          <div className="space-y-2">
            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
            <p className="text-xs text-center text-muted-foreground">
              {Math.round(progress)}%
            </p>
          </div>
        )}

        {/* Status Message */}
        <div className="text-center">
          {currentStep === 'complete' && (
            <p className="text-sm text-green-600 dark:text-green-400">
              ✅ 일정 추출 완료!
            </p>
          )}
          {currentStep === 'error' && error && (
            <p className="text-sm text-destructive">
              ❌ {error}
            </p>
          )}
          {currentStep !== 'complete' && currentStep !== 'error' && (
            <p className="text-sm text-muted-foreground">
              {currentStep === 'upload' && '파일을 업로드하고 있습니다...'}
              {currentStep === 'ocr' && '이미지에서 텍스트를 추출하고 있습니다...'}
              {currentStep === 'analysis' && 'AI가 일정 정보를 분석하고 있습니다...'}
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}

// Mobile-optimized loading skeleton
export function LoadingSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse", className)}>
      <div className="space-y-3">
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-4 bg-muted rounded w-1/2" />
        <div className="h-4 bg-muted rounded w-5/6" />
      </div>
    </div>
  )
}