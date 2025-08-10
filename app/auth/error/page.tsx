import Link from 'next/link'
import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react'

export const metadata = {
  title: 'Authentication Error - Photo Calendar',
  description: 'An error occurred during authentication',
  robots: 'noindex, nofollow',
}

interface PageProps {
  searchParams: {
    error?: string
    message?: string
  }
}

function getErrorDetails(error?: string) {
  switch (error) {
    case 'Configuration':
      return {
        title: 'Configuration Error',
        description: 'There is a problem with the server configuration. Please try again later.',
        suggestion: 'Contact support if the problem persists.',
      }
    case 'AccessDenied':
      return {
        title: 'Access Denied',
        description: 'You do not have permission to sign in with this account.',
        suggestion: 'Please check your account permissions or contact your administrator.',
      }
    case 'Verification':
      return {
        title: 'Verification Failed',
        description: 'The verification link is invalid or has expired.',
        suggestion: 'Please request a new verification link.',
      }
    case 'OAuthSignin':
    case 'OAuthCallback':
    case 'OAuthCreateAccount':
      return {
        title: 'OAuth Error',
        description: 'There was an error with the OAuth provider during authentication.',
        suggestion: 'Please try signing in again. If the problem persists, try a different provider.',
      }
    case 'OAuthAccountNotLinked':
      return {
        title: 'Account Already Exists',
        description: 'An account with this email already exists with a different provider.',
        suggestion: 'Please sign in with the provider you originally used, or contact support.',
      }
    case 'EmailCreateAccount':
      return {
        title: 'Email Account Creation Failed',
        description: 'Unable to create an account with this email address.',
        suggestion: 'Please try again or contact support for assistance.',
      }
    case 'Callback':
      return {
        title: 'Callback Error',
        description: 'An error occurred during the authentication callback.',
        suggestion: 'Please try signing in again.',
      }
    case 'CredentialsSignin':
      return {
        title: 'Invalid Credentials',
        description: 'The credentials you provided are incorrect.',
        suggestion: 'Please check your email and password and try again.',
      }
    case 'SessionRequired':
      return {
        title: 'Session Required',
        description: 'You must be signed in to access this resource.',
        suggestion: 'Please sign in and try again.',
      }
    default:
      return {
        title: 'Authentication Error',
        description: 'An unexpected error occurred during authentication.',
        suggestion: 'Please try again. If the problem persists, contact support.',
      }
  }
}

export default function AuthErrorPage({ searchParams }: PageProps) {
  const { error, message } = searchParams
  const errorDetails = getErrorDetails(error)

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {errorDetails.title}
          </h1>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8 space-y-6">
          <div className="text-center space-y-4">
            <p className="text-gray-600">
              {errorDetails.description}
            </p>
            
            {message && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  Technical details: {message}
                </p>
              </div>
            )}

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Suggestion:</strong> {errorDetails.suggestion}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Link
              href="/auth/signin"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Link>

            <Link
              href="/"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Go Home
            </Link>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Need help?{' '}
            <Link href="/contact" className="text-blue-600 hover:text-blue-500 font-medium">
              Contact Support
            </Link>
          </p>
        </div>

        {process.env.NODE_ENV === 'development' && error && (
          <div className="mt-8 p-4 bg-gray-100 border border-gray-300 rounded-lg">
            <p className="text-xs text-gray-600">
              <strong>Debug Info:</strong> Error code: {error}
            </p>
            {message && (
              <p className="text-xs text-gray-600 mt-1">
                <strong>Message:</strong> {message}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}