import { PageContainer } from "@/components/shell/page-header";
import { DepartmentDetailClient } from "./department-detail-client";

export default async function DepartmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PageContainer>
      <DepartmentDetailClient id={id} />
    </PageContainer>
  );
}
