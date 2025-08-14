# Photo Calendar Deployment Checklist

## Pre-deployment Verification

### ✅ Development Completed

1. **Google Calendar 양방향 동기화** ✅
   - Bidirectional sync manager implemented
   - Conflict resolution logic
   - API endpoints for sync operations
   - UI components for sync management

2. **충돌 해결 로직** ✅
   - Manual conflict resolution UI
   - Automated conflict resolution strategies
   - Conflict resolution API endpoints

3. **실시간 Webhook 연동** ✅
   - Google Calendar webhook handler
   - Webhook subscription management
   - Real-time sync settings UI
   - Webhook lifecycle management

4. **알림 기능** ✅
   - Email notification service
   - Push notification framework
   - Notification settings UI
   - Test notification endpoints

## Deployment Tasks

### Database Migration

- [ ] Run Prisma migrations to add new fields
- [ ] Verify database schema is up to date
- [ ] Test database connectivity

### Environment Variables

- [ ] Verify all required environment variables are set in Vercel
- [ ] Test Google OAuth configuration
- [ ] Verify SMTP settings for notifications
- [ ] Check VAPID keys for push notifications

### Code Quality

- [ ] Run TypeScript type checking
- [ ] Run ESLint checks
- [ ] Test build process
- [ ] Verify all imports are working

### Testing

- [ ] Test Google Calendar sync functionality
- [ ] Test conflict resolution workflows
- [ ] Test webhook integration
- [ ] Test notification system
- [ ] Verify mobile responsiveness
- [ ] Test with real user accounts

### Security

- [ ] Verify API authentication is working
- [ ] Test rate limiting
- [ ] Verify webhook security tokens
- [ ] Check for sensitive data exposure

### Performance

- [ ] Test page load times
- [ ] Verify API response times
- [ ] Check bundle size
- [ ] Test with large datasets

## Production Configuration

### Required Environment Variables

```
# Authentication
NEXTAUTH_URL=https://photo-calendar.vercel.app
NEXTAUTH_SECRET=[secure-secret]

# Google OAuth & APIs
GOOGLE_CLIENT_ID=[client-id]
GOOGLE_CLIENT_SECRET=[client-secret]
GOOGLE_API_KEY=[api-key]
GOOGLE_CLOUD_PROJECT=photo-calendar-20250811-150939
GOOGLE_APPLICATION_CREDENTIALS_BASE64=[base64-encoded-service-account]

# Database
DATABASE_URL=[supabase-connection-string]

# OpenAI
OPENAI_API_KEY=[api-key]

# SMTP (Optional - for notifications)
SMTP_HOST=[smtp-server]
SMTP_PORT=587
SMTP_USER=[smtp-username]
SMTP_PASS=[smtp-password]
SMTP_FROM="Photo Calendar <noreply@photo-calendar.app>"

# Push Notifications (Optional)
VAPID_PUBLIC_KEY=[vapid-public-key]
VAPID_PRIVATE_KEY=[vapid-private-key]

# Webhooks
CALENDAR_WEBHOOK_TOKEN=[webhook-token]
```

## Post-deployment Verification

### Functional Testing

- [ ] User can sign in with Google OAuth
- [ ] Photo upload and OCR processing works
- [ ] Events are created from photos
- [ ] Calendar views render correctly
- [ ] Google Calendar sync works bidirectionally
- [ ] Conflict resolution functions properly
- [ ] Real-time webhooks trigger sync
- [ ] Email notifications are sent
- [ ] Push notifications work (if configured)

### Performance Monitoring

- [ ] Page load times under 3 seconds
- [ ] API response times under 2 seconds
- [ ] OCR processing completes within 30 seconds
- [ ] Database queries are optimized
- [ ] No memory leaks or excessive resource usage

### Error Handling

- [ ] Graceful error handling for failed API calls
- [ ] Proper error messages for users
- [ ] Error logging and monitoring setup
- [ ] Fallback mechanisms for external service failures

## Rollback Plan

In case of deployment issues:

1. **Immediate Rollback**
   - Revert to previous Vercel deployment
   - Check database integrity
   - Verify core functionality

2. **Communication**
   - Notify users of any service disruption
   - Update status page if available
   - Document lessons learned

## Monitoring & Maintenance

### Regular Checks

- [ ] Monitor webhook subscription renewals (every 24 hours)
- [ ] Check Google API quota usage
- [ ] Monitor database performance
- [ ] Review error logs weekly
- [ ] Verify backup systems

### Updates

- [ ] Keep dependencies up to date
- [ ] Monitor Google API changes
- [ ] Update documentation as needed
- [ ] Plan for feature enhancements

## Success Criteria

- [ ] All core features working in production
- [ ] Users can successfully complete the full workflow
- [ ] No critical errors in production logs
- [ ] Performance metrics within acceptable ranges
- [ ] Security measures functioning correctly

## Notes

- The project uses Vercel for hosting with automatic deployments from GitHub
- Google Cloud Vision API requires active billing account
- Webhook subscriptions need periodic renewal (24-hour limitation)
- Real-time sync is optional but recommended for better UX
- Email notifications require SMTP configuration
- Push notifications require HTTPS and service worker registration