import QuizRunner from "@/components/QuizRunner";

export default async function QuizPage({
  params,
}: {
  params: Promise<{ cert: string }>;
}) {
  const { cert } = await params;
  return <QuizRunner certId={cert} />;
}
