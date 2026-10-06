import { Suspense } from "react";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportsClient } from "./reports-client";

export default function ReportsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Task Reports"
        description="Involvement, delivery and deadlines per employee — exportable."
        className="print:hidden"
      />
      <div className="mt-6 print:mt-0">
        <Suspense fallback={<Skeleton className="h-96 rounded-xl" />}>
          <ReportsClient />
        </Suspense>
      </div>
    </PageContainer>
  );
}
