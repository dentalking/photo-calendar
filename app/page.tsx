import Link from 'next/link';
import { Calendar, Camera, Sparkles, Zap, Shield, Clock, ArrowRight, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Navigation */}
      <nav className="bg-white dark:bg-gray-900 shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" aria-hidden="true" />
              <span className="ml-2 text-lg sm:text-xl font-bold">Photo Calendar</span>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Link href="/auth/signin" aria-label="로그인 페이지로 이동">
                <Button variant="ghost" className="text-sm sm:text-base px-2 sm:px-4">로그인</Button>
              </Link>
              <Link href="/auth/signin" aria-label="회원가입 페이지로 이동">
                <Button className="text-sm sm:text-base px-3 sm:px-4">시작하기</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20 pb-12 sm:pb-16">
          <div className="text-center">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-gray-900 dark:text-white">
              사진 한 장으로
              <span className="block text-blue-600 mt-2">일정 관리를 마법처럼</span>
            </h1>
            <p className="mt-4 sm:mt-6 text-base sm:text-lg md:text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto px-4">
              포스터, 초대장, 영수증을 사진으로 찍으면 AI가 자동으로 일정을 추출하여 
              캘린더에 등록합니다. 복잡한 설정 없이 바로 시작하세요.
            </p>
            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row justify-center items-center space-y-3 sm:space-y-0 sm:space-x-4">
              <Link href="/auth/signin" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto px-6 sm:px-8 h-12 sm:h-11 text-base sm:text-sm">
                  무료로 시작하기 <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="#features" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="w-full sm:w-auto px-6 sm:px-8 h-12 sm:h-11 text-base sm:text-sm">
                  자세히 알아보기
                </Button>
              </Link>
            </div>
          </div>

          {/* Demo Image */}
          <div className="mt-16 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-gray-800 via-transparent to-transparent z-10"></div>
            <Card className="overflow-hidden shadow-2xl">
              <div className="aspect-video bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 flex items-center justify-center">
                <div className="text-center p-8">
                  <Camera className="h-24 w-24 mx-auto text-blue-600 mb-4" aria-hidden="true" />
                  <p className="text-2xl font-semibold text-gray-800 dark:text-gray-200">
                    사진을 캘린더로 변환하는 마법
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              강력한 기능들
            </h2>
            <p className="mt-4 text-xl text-gray-600 dark:text-gray-300">
              일정 관리를 더 쉽고 빠르게 만들어드립니다
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-blue-600" aria-hidden="true" />
              </div>
              <h3 className="text-xl font-semibold mb-2">AI 텍스트 인식</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Google Vision API와 GPT-4를 활용한 정확한 텍스트 추출 및 일정 파싱
              </p>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-green-600" aria-hidden="true" />
              </div>
              <h3 className="text-xl font-semibold mb-2">빠른 처리</h3>
              <p className="text-gray-600 dark:text-gray-400">
                기존 5단계 과정을 단 1단계로 단축. 3초 이내 일정 등록 완료
              </p>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center mb-4">
                <Calendar className="h-6 w-6 text-purple-600" aria-hidden="true" />
              </div>
              <h3 className="text-xl font-semibold mb-2">캘린더 연동</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Google Calendar와 완벽한 연동. 모든 기기에서 동기화
              </p>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-orange-600" aria-hidden="true" />
              </div>
              <h3 className="text-xl font-semibold mb-2">보안 우선</h3>
              <p className="text-gray-600 dark:text-gray-400">
                OAuth 2.0 인증과 암호화된 데이터 저장으로 개인정보 보호
              </p>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900 rounded-lg flex items-center justify-center mb-4">
                <Camera className="h-6 w-6 text-pink-600" aria-hidden="true" />
              </div>
              <h3 className="text-xl font-semibold mb-2">다양한 포맷 지원</h3>
              <p className="text-gray-600 dark:text-gray-400">
                포스터, 초대장, 티켓, 영수증 등 모든 이미지 형식 지원
              </p>
            </Card>

            <Card className="p-6 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center mb-4">
                <Clock className="h-6 w-6 text-indigo-600" aria-hidden="true" />
              </div>
              <h3 className="text-xl font-semibold mb-2">시간 절약</h3>
              <p className="text-gray-600 dark:text-gray-400">
                수동 입력 대비 90% 시간 절약. 실수 없는 정확한 일정 등록
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              사용 방법
            </h2>
            <p className="mt-4 text-xl text-gray-600 dark:text-gray-300">
              3단계로 완료되는 간단한 프로세스
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                1
              </div>
              <h3 className="text-xl font-semibold mb-2">사진 촬영</h3>
              <p className="text-gray-600 dark:text-gray-400">
                일정이 포함된 포스터나 문서를 사진으로 촬영하세요
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                2
              </div>
              <h3 className="text-xl font-semibold mb-2">AI 분석</h3>
              <p className="text-gray-600 dark:text-gray-400">
                AI가 자동으로 텍스트를 추출하고 일정 정보를 파악합니다
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
                3
              </div>
              <h3 className="text-xl font-semibold mb-2">캘린더 등록</h3>
              <p className="text-gray-600 dark:text-gray-400">
                확인 후 클릭 한 번으로 캘린더에 일정이 등록됩니다
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">
              요금제
            </h2>
            <p className="mt-4 text-xl text-gray-600 dark:text-gray-300">
              필요에 맞는 플랜을 선택하세요
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="p-8 border-2">
              <h3 className="text-2xl font-bold mb-4">무료</h3>
              <p className="text-4xl font-bold mb-6">
                ₩0<span className="text-base font-normal text-gray-600">/월</span>
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <ChevronRight className="h-5 w-5 text-green-500 mr-2" />
                  월 30장 사진 처리
                </li>
                <li className="flex items-center">
                  <ChevronRight className="h-5 w-5 text-green-500 mr-2" />
                  기본 OCR 기능
                </li>
                <li className="flex items-center">
                  <ChevronRight className="h-5 w-5 text-green-500 mr-2" />
                  Google Calendar 연동
                </li>
                <li className="flex items-center">
                  <ChevronRight className="h-5 w-5 text-green-500 mr-2" />
                  이메일 지원
                </li>
              </ul>
              <Link href="/auth/signin">
                <Button className="w-full" variant="outline">
                  무료로 시작하기
                </Button>
              </Link>
            </Card>

            <Card className="p-8 border-2 border-blue-600 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-blue-600 text-white px-4 py-1 rounded-full text-sm">
                  인기
                </span>
              </div>
              <h3 className="text-2xl font-bold mb-4">Pro</h3>
              <p className="text-4xl font-bold mb-6">
                ₩9,900<span className="text-base font-normal text-gray-600">/월</span>
              </p>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <ChevronRight className="h-5 w-5 text-green-500 mr-2" />
                  월 1,000장 사진 처리
                </li>
                <li className="flex items-center">
                  <ChevronRight className="h-5 w-5 text-green-500 mr-2" />
                  고급 AI 분석
                </li>
                <li className="flex items-center">
                  <ChevronRight className="h-5 w-5 text-green-500 mr-2" />
                  모든 캘린더 연동
                </li>
                <li className="flex items-center">
                  <ChevronRight className="h-5 w-5 text-green-500 mr-2" />
                  우선 지원
                </li>
                <li className="flex items-center">
                  <ChevronRight className="h-5 w-5 text-green-500 mr-2" />
                  팀 공유 기능
                </li>
              </ul>
              <Link href="/auth/signin">
                <Button className="w-full">
                  Pro 시작하기
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-600 dark:bg-blue-700">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            지금 바로 시작하세요
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            매달 30장까지 무료로 사용할 수 있습니다. 신용카드 등록 불필요.
          </p>
          <Link href="/auth/signin">
            <Button size="lg" variant="secondary" className="px-8">
              무료로 시작하기 <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Calendar className="h-8 w-8 text-blue-400" />
                <span className="ml-2 text-xl font-bold">Photo Calendar</span>
              </div>
              <p className="text-gray-400">
                사진으로 일정을 관리하는 가장 쉬운 방법
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">제품</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#features" className="hover:text-white">기능</Link></li>
                <li><Link href="#pricing" className="hover:text-white">요금제</Link></li>
                <li><Link href="#" className="hover:text-white">API</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">회사</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#" className="hover:text-white">소개</Link></li>
                <li><Link href="#" className="hover:text-white">블로그</Link></li>
                <li><Link href="#" className="hover:text-white">채용</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">지원</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="#" className="hover:text-white">도움말</Link></li>
                <li><Link href="#" className="hover:text-white">문의하기</Link></li>
                <li><Link href="#" className="hover:text-white">개인정보처리방침</Link></li>
                <li><Link href="#" className="hover:text-white">이용약관</Link></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Photo Calendar. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
