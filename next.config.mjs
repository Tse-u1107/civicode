/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  reactCompiler: true,
  serverExternalPackages: [
    "chromadb",
    "@chroma-core/default-embed",
    "@chroma-core/ai-embeddings-common",
  ],
};

export default nextConfig;
