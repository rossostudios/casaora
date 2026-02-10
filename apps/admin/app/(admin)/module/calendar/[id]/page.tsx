import ModuleRecordPage from "../../[slug]/[id]/page";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function CalendarRecordPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <ModuleRecordPage params={Promise.resolve({ slug: "calendar", id })} />
  );
}
