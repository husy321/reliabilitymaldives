import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize development performance
  experimental: {
    cpus: 4, // Use more CPUs for better performance
    workerThreads: true, // Enable worker threads for faster compilation
  },
  
  // Webpack configuration for better performance
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Optimize module resolution
      config.resolve.alias = {
        ...config.resolve.alias,
        '@': require('path').resolve(__dirname, 'src'),
      };
    }
    
    return config;
  },
  
  // Development specific settings for better performance
  ...(process.env.NODE_ENV === 'development' && {
    onDemandEntries: {
      // Keep pages in buffer longer to reduce recompilation
      maxInactiveAge: 60 * 1000, // 60 seconds
      // Keep more pages in memory
      pagesBufferLength: 5,
    },
  }),
};

export default nextConfig;
