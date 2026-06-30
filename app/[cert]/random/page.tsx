import RandomQuestion from "@/components/RandomQuestion";

export default async function RandomPage({
  params,
}: {
  params: Promise<{ cert: string }>;
}) {
  const { cert } = await params;
  return <RandomQuestion certId={cert} />;
}
