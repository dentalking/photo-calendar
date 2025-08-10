/**
 * OCR Integration Example
 * Demonstrates how to use the OCR service in your photo-to-calendar application
 */

'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, Calendar, MapPin, Clock, DollarSign, User } from 'lucide-react';

interface OCRResult {
  text: string;
  confidence: number;
  language: string;
  extractedData: {
    dates: Array<{
      text: string;
      normalized: string | null;
      type: string;
      confidence: number;
      format: string;
    }>;
    locations: Array<{
      name: string;
      type: string;
      confidence: number;
    }>;
    costs: Array<{
      amount: number;
      currency: string;
      type: string;
      description?: string;
    }>;
    contacts: Array<{
      name: string;
      type: string;
      role?: string;
      phone?: string;
      email?: string;
    }>;
    urls: string[];
    emails: string[];
    phoneNumbers: string[];
  };
  metadata: {
    processingTime: number;
    ocrEngine: string;
    cacheHit: boolean;
    textQuality: string;
    warnings: string[];
  };
}

interface CalendarEvent {
  title: string;
  description: string;
  startDate: string | null;
  endDate: string | null;
  isAllDay: boolean;
  location: string | null;
}

export default function OCRIntegrationExample() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [calendarEvent, setCalendarEvent] = useState<CalendarEvent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocumentType, setSelectedDocumentType] = useState('poster');

  // Handle file drop
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setIsProcessing(true);
    setError(null);
    setOcrResult(null);
    setCalendarEvent(null);

    try {
      // Basic OCR extraction
      await performOCR(file);
      
      // Calendar-specific extraction
      await extractCalendarEvent(file);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OCR processing failed');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedDocumentType]);

  // Basic OCR extraction
  const performOCR = async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('documentType', selectedDocumentType);
    formData.append('enableFallback', 'true');

    const response = await fetch('/api/ocr/extract', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'OCR request failed');
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error(result.error || 'OCR processing failed');
    }

    setOcrResult(result.data);
  };

  // Calendar-specific extraction
  const extractCalendarEvent = async (file: File) => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('documentType', selectedDocumentType);

    const response = await fetch('/api/ocr/calendar', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      console.warn('Calendar extraction failed, using basic OCR result');
      return;
    }

    const result = await response.json();
    if (result.success) {
      setCalendarEvent(result.data.event);
    }
  };

  // Dropzone configuration
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.tiff']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024, // 10MB
  });

  const documentTypes = [
    { value: 'poster', label: 'Poster/Flyer' },
    { value: 'invitation', label: 'Invitation' },
    { value: 'ticket', label: 'Ticket' },
    { value: 'receipt', label: 'Receipt' },
    { value: 'menu', label: 'Menu' },
    { value: 'sign', label: 'Sign' },
  ];

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold">OCR Integration Example</h1>
        <p className="text-gray-600">
          Upload an image to extract text and calendar event information
        </p>
      </div>

      {/* Document Type Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Document Type</CardTitle>
          <CardDescription>
            Select the type of document for optimized processing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {documentTypes.map((type) => (
              <Button
                key={type.value}
                variant={selectedDocumentType === type.value ? "default" : "outline"}
                onClick={() => setSelectedDocumentType(type.value)}
                size="sm"
              >
                {type.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* File Upload */}
      <Card>
        <CardContent className="p-6">
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
            `}
          >
            <input {...getInputProps()} />
            {isProcessing ? (
              <div className="space-y-4">
                <Loader2 className="w-12 h-12 mx-auto animate-spin text-blue-500" />
                <p className="text-lg font-medium">Processing image...</p>
                <p className="text-sm text-gray-500">
                  This may take a few seconds
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="w-12 h-12 mx-auto text-gray-400" />
                <div>
                  <p className="text-lg font-medium">
                    {isDragActive ? 'Drop the image here' : 'Drag & drop an image here'}
                  </p>
                  <p className="text-sm text-gray-500">
                    or click to select a file (max 10MB)
                  </p>
                </div>
                <p className="text-xs text-gray-400">
                  Supports JPEG, PNG, WebP, TIFF
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Calendar Event Result */}
      {calendarEvent && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Extracted Calendar Event
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg">{calendarEvent.title}</h3>
              {calendarEvent.description && (
                <p className="text-gray-600 mt-1">{calendarEvent.description}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {calendarEvent.startDate && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <div>
                    <p className="text-sm font-medium">Start Date</p>
                    <p className="text-sm text-gray-600">
                      {new Date(calendarEvent.startDate).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {calendarEvent.endDate && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-red-500" />
                  <div>
                    <p className="text-sm font-medium">End Date</p>
                    <p className="text-sm text-gray-600">
                      {new Date(calendarEvent.endDate).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {calendarEvent.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Location</p>
                    <p className="text-sm text-gray-600">{calendarEvent.location}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2">
                <Badge variant={calendarEvent.isAllDay ? "default" : "secondary"}>
                  {calendarEvent.isAllDay ? 'All Day' : 'Specific Time'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* OCR Results */}
      {ocrResult && (
        <div className="space-y-6">
          {/* Extracted Text */}
          <Card>
            <CardHeader>
              <CardTitle>Extracted Text</CardTitle>
              <CardDescription>
                Confidence: {Math.round(ocrResult.confidence * 100)}% | 
                Language: {ocrResult.language} | 
                Engine: {ocrResult.metadata.ocrEngine}
                {ocrResult.metadata.cacheHit && ' (Cached)'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 rounded-lg p-4">
                <pre className="whitespace-pre-wrap text-sm">
                  {ocrResult.text || 'No text detected'}
                </pre>
              </div>
            </CardContent>
          </Card>

          {/* Structured Data */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Dates */}
            {ocrResult.extractedData.dates.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Dates & Times
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {ocrResult.extractedData.dates.map((date, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium">{date.text}</p>
                          <p className="text-xs text-gray-500">
                            Type: {date.type} | Format: {date.format}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {Math.round(date.confidence * 100)}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Locations */}
            {ocrResult.extractedData.locations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Locations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {ocrResult.extractedData.locations.map((location, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium">{location.name}</p>
                          <p className="text-xs text-gray-500">Type: {location.type}</p>
                        </div>
                        <Badge variant="outline">
                          {Math.round(location.confidence * 100)}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Costs */}
            {ocrResult.extractedData.costs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Costs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {ocrResult.extractedData.costs.map((cost, index) => (
                      <div key={index} className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium">
                            {cost.amount.toLocaleString()} {cost.currency}
                          </p>
                          <p className="text-xs text-gray-500">
                            Type: {cost.type}
                            {cost.description && ` | ${cost.description}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Contacts */}
            {ocrResult.extractedData.contacts.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Contacts
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {ocrResult.extractedData.contacts.map((contact, index) => (
                      <div key={index}>
                        <p className="text-sm font-medium">{contact.name}</p>
                        <div className="text-xs text-gray-500">
                          {contact.role && <span>Role: {contact.role}</span>}
                          {contact.phone && <span> | Phone: {contact.phone}</span>}
                          {contact.email && <span> | Email: {contact.email}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Additional Data */}
          {(ocrResult.extractedData.urls.length > 0 || 
            ocrResult.extractedData.emails.length > 0 || 
            ocrResult.extractedData.phoneNumbers.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle>Additional Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {ocrResult.extractedData.urls.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">URLs</p>
                    <div className="space-y-1">
                      {ocrResult.extractedData.urls.map((url, index) => (
                        <a
                          key={index}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-sm block"
                        >
                          {url}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {ocrResult.extractedData.emails.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Email Addresses</p>
                    <div className="space-y-1">
                      {ocrResult.extractedData.emails.map((email, index) => (
                        <a
                          key={index}
                          href={`mailto:${email}`}
                          className="text-blue-600 hover:underline text-sm block"
                        >
                          {email}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {ocrResult.extractedData.phoneNumbers.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2">Phone Numbers</p>
                    <div className="space-y-1">
                      {ocrResult.extractedData.phoneNumbers.map((phone, index) => (
                        <a
                          key={index}
                          href={`tel:${phone}`}
                          className="text-blue-600 hover:underline text-sm block"
                        >
                          {phone}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Processing Metadata */}
          <Card>
            <CardHeader>
              <CardTitle>Processing Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="font-medium">Processing Time</p>
                  <p className="text-gray-600">{ocrResult.metadata.processingTime}ms</p>
                </div>
                <div>
                  <p className="font-medium">OCR Engine</p>
                  <p className="text-gray-600">{ocrResult.metadata.ocrEngine}</p>
                </div>
                <div>
                  <p className="font-medium">Text Quality</p>
                  <p className="text-gray-600">{ocrResult.metadata.textQuality}</p>
                </div>
                <div>
                  <p className="font-medium">Cache Hit</p>
                  <p className="text-gray-600">
                    {ocrResult.metadata.cacheHit ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>

              {ocrResult.metadata.warnings.length > 0 && (
                <div className="mt-4">
                  <p className="font-medium text-orange-600 mb-2">Warnings</p>
                  <ul className="text-sm text-orange-600 list-disc list-inside">
                    {ocrResult.metadata.warnings.map((warning, index) => (
                      <li key={index}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}