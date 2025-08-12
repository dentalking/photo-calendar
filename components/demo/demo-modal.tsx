'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PhotoUploadEnhanced } from '@/components/ui/photo-upload-enhanced';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Camera, Sparkles, Download, Play } from 'lucide-react';
import toast from 'react-hot-toast';

interface DemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DemoModal({ isOpen, onClose }: DemoModalProps) {
  const [step, setStep] = useState<'intro' | 'upload' | 'result'>('intro');
  const [demoImage, setDemoImage] = useState<string | null>(null);

  const sampleImages = [
    {
      id: 1,
      name: '콘서트 포스터',
      url: '/demo/concert-poster.jpg',
      description: '아이유 콘서트 2024',
      extractedData: {
        title: '아이유 콘서트 - The Golden Hour',
        date: '2024년 12월 24일 19:00',
        location: '고척 스카이돔',
        confidence: 0.95
      }
    },
    {
      id: 2,
      name: '회의 초대장',
      url: '/demo/meeting-invite.jpg',
      description: '팀 미팅 초대',
      extractedData: {
        title: '2024 Q4 전략 회의',
        date: '2024년 12월 15일 14:00',
        location: '회의실 A (3층)',
        confidence: 0.92
      }
    },
    {
      id: 3,
      name: '생일 파티 초대장',
      url: '/demo/birthday-invite.jpg',
      description: '생일 파티',
      extractedData: {
        title: '민수 생일 파티 🎉',
        date: '2024년 12월 20일 18:00',
        location: '강남 파티룸',
        confidence: 0.88
      }
    }
  ];

  const handleSampleImageSelect = (sample: typeof sampleImages[0]) => {
    setDemoImage(sample.url);
    setStep('result');
    
    // 시뮬레이션 처리
    toast.loading('이미지 처리 중...', { duration: 1500 });
    
    setTimeout(() => {
      toast.success('일정을 성공적으로 추출했습니다!', {
        duration: 3000,
        position: 'top-center',
      });
    }, 1500);
  };

  const handleReset = () => {
    setStep('intro');
    setDemoImage(null);
  };

  const handleDownloadSample = () => {
    toast.success('샘플 이미지를 다운로드했습니다', {
      duration: 2000,
      position: 'top-center',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            Photo Calendar 데모 체험
          </DialogTitle>
          <DialogDescription>
            로그인 없이 Photo Calendar의 핵심 기능을 체험해보세요
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6">
          {step === 'intro' && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Camera className="h-10 w-10 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">
                  사진에서 일정을 추출하는 마법을 체험해보세요
                </h3>
                <p className="text-gray-600 max-w-2xl mx-auto">
                  포스터, 초대장, 티켓 등의 이미지를 업로드하면 AI가 자동으로 일정 정보를 추출합니다.
                  샘플 이미지로 먼저 테스트해보세요!
                </p>
              </div>

              <div className="space-y-4">
                <h4 className="text-sm font-medium text-gray-700">샘플 이미지로 시작하기</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {sampleImages.map((sample) => (
                    <Card
                      key={sample.id}
                      className="p-4 cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => handleSampleImageSelect(sample)}
                    >
                      <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg mb-3 flex items-center justify-center">
                        <Camera className="h-8 w-8 text-gray-400" />
                      </div>
                      <h5 className="font-medium text-sm">{sample.name}</h5>
                      <p className="text-xs text-gray-500 mt-1">{sample.description}</p>
                      <Button variant="ghost" size="sm" className="mt-2 w-full">
                        <Play className="h-3 w-3 mr-1" />
                        체험하기
                      </Button>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-gray-500">또는</span>
                </div>
              </div>

              <div className="text-center">
                <Button onClick={() => setStep('upload')} size="lg">
                  내 이미지 업로드하기
                </Button>
                <p className="text-xs text-gray-500 mt-2">
                  직접 이미지를 업로드하여 테스트할 수 있습니다
                </p>
              </div>
            </div>
          )}

          {step === 'upload' && (
            <div className="space-y-6">
              <PhotoUploadEnhanced
                maxFiles={1}
                multiple={false}
                autoProcess={true}
                onProcessComplete={(file) => {
                  setStep('result');
                }}
              />
              
              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep('intro')}>
                  뒤로 가기
                </Button>
                <Button variant="ghost" onClick={handleDownloadSample}>
                  <Download className="h-4 w-4 mr-2" />
                  샘플 이미지 다운로드
                </Button>
              </div>
            </div>
          )}

          {step === 'result' && (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <Calendar className="h-8 w-8 text-green-600" />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-green-900 mb-2">
                      일정 추출 완료!
                    </h3>
                    <p className="text-sm text-green-700 mb-4">
                      AI가 이미지에서 다음 일정 정보를 추출했습니다:
                    </p>
                    
                    <Card className="p-4 bg-white">
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-gray-500">일정 제목</p>
                          <p className="font-medium">2024 Q4 전략 회의</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">일시</p>
                          <p className="font-medium">2024년 12월 15일 14:00</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">장소</p>
                          <p className="font-medium">회의실 A (3층)</p>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs text-gray-500">AI 신뢰도</p>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 bg-gray-200 rounded-full h-2 w-24">
                                <div className="bg-green-600 h-2 rounded-full" style={{ width: '92%' }} />
                              </div>
                              <span className="text-sm font-medium">92%</span>
                            </div>
                          </div>
                          <Badge className="bg-green-100 text-green-800">
                            확인됨
                          </Badge>
                        </div>
                      </div>
                    </Card>
                    
                    <div className="mt-4 flex gap-2">
                      <Button size="sm">
                        캘린더에 추가
                      </Button>
                      <Button size="sm" variant="outline">
                        수정하기
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-900 font-medium mb-2">
                  💡 실제 서비스에서는:
                </p>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• Google Calendar와 자동 동기화</li>
                  <li>• 여러 이미지 동시 처리 가능</li>
                  <li>• 반복 일정 자동 설정</li>
                  <li>• 팀원과 일정 공유</li>
                </ul>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={handleReset}>
                  다시 시도하기
                </Button>
                <Button onClick={onClose}>
                  시작하기
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}