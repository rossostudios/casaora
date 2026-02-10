import ModuleRecordPage from "../../[slug]/[id]/page";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReservationRecordPage({ params }: PageProps) {
  const { id } = await params;

  return (
    <ModuleRecordPage params={Promise.resolve({ slug: "reservations", id })} />
  );
}
