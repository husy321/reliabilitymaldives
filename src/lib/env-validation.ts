// Environment variable validation for authentication
export function validateAuthEnv() {
  const required = {
    DATABASE_URL: process.env.DATABASE_URL,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
  };
  
  // Only require Upstash in production
  const optionalInDev = {
    UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
  };

  // Check optional variables in production
  if (process.env.NODE_ENV === "production") {
    for (const [key, value] of Object.entries(optionalInDev)) {
      if (!value) {
        missing.push(key);
      }
    }
  }

  const missing: string[] = [];
  
  for (const [key, value] of Object.entries(required)) {
    if (!value) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}\n` +
      `Please check your .env.local file and ensure all required variables are set.`
    );
  }

  // Validate NEXTAUTH_SECRET length (should be at least 32 characters)
  if (required.NEXTAUTH_SECRET && required.NEXTAUTH_SECRET.length < 32) {
    console.warn(
      "Warning: NEXTAUTH_SECRET should be at least 32 characters for security. " +
      "Generate a secure secret using: openssl rand -base64 32"
    );
  }

  // Validate NEXTAUTH_URL format
  if (required.NEXTAUTH_URL) {
    try {
      new URL(required.NEXTAUTH_URL);
    } catch {
      throw new Error(
        `Invalid NEXTAUTH_URL format: ${required.NEXTAUTH_URL}. ` +
        `It should be a valid URL like http://localhost:3000 or https://yourdomain.com`
      );
    }
  }

  return true;
}

// Run validation on module load in non-test environments
if (typeof jest === "undefined" && process.env.NODE_ENV !== "test") {
  try {
    validateAuthEnv();
  } catch (error) {
    console.error("Environment validation failed:", error);
    // In development, log the error but don't crash
    // In production, this should fail fast
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
  }
}