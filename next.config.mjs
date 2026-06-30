/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: "/certificaciones",
        destination: "https://certifications-alpha.vercel.app/",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
