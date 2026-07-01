import StudyMode from "@/components/StudyMode";

export default async function StudyPage({
  params,
}: {
  params: Promise<{ cert: string }>;
}) {
  const { cert } = await params;
  return <StudyMode certId={cert} />;
}
