import CertHome from "@/components/CertHome";

export default async function CertHomePage({
  params,
}: {
  params: Promise<{ cert: string }>;
}) {
  const { cert } = await params;
  return <CertHome certId={cert} />;
}
