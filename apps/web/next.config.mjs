/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@attuna/ui", "@attuna/db"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
