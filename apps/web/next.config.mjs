/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  transpilePackages: ["@protypic/shared"],
  experimental: {
    serverComponentsExternalPackages: ["firebase-admin", "@google-cloud/storage"],
  },
};

export default nextConfig;
