/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config, { isServer }) => {
    // Handle server-side only modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        'require-in-the-middle': false,
        '@opentelemetry/instrumentation': false,
        '@opentelemetry/exporter-jaeger': false,
        '@genkit-ai/firebase': false,
        handlebars: false,
      };
    }

    // Ignore specific modules that cause issues
    config.externals = config.externals || [];
    if (!isServer) {
      config.externals.push({
        'require-in-the-middle': 'commonjs require-in-the-middle',
        '@opentelemetry/instrumentation': 'commonjs @opentelemetry/instrumentation',
        '@opentelemetry/exporter-jaeger': 'commonjs @opentelemetry/exporter-jaeger',
        '@genkit-ai/firebase': 'commonjs @genkit-ai/firebase',
        handlebars: 'commonjs handlebars',
      });
    }

    // Suppress specific warnings
    config.ignoreWarnings = [
      /require.extensions is not supported by webpack/,
      /Critical dependency: require function is used in a way in which dependencies cannot be statically extracted/,
      /Module not found: Can't resolve '@opentelemetry\/exporter-jaeger'/,
      /Module not found: Can't resolve '@genkit-ai\/firebase'/,
    ];

    return config;
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
