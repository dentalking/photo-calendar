import GoogleProvider from 'next-auth/providers/google';

// Custom Google Provider with Calendar scopes
export function getGoogleProvider() {
  const baseUrl = "https://accounts.google.com/o/oauth2/v2/auth";
  const params = new URLSearchParams({
    scope: "openid email profile https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events",
    access_type: "offline",
    prompt: "consent",
  });
  
  return GoogleProvider({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    // Use the full authorization URL with Calendar scopes
    authorization: `${baseUrl}?${params.toString()}`,
    // Explicitly set the profile callback
    profile(profile) {
      return {
        id: profile.sub,
        name: profile.name,
        email: profile.email,
        image: profile.picture,
      };
    },
  });
}