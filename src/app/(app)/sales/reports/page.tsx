import { Suspense } from "react";
import { PageContainer, PageHeader } from "@/components/shell/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { ReportsClient } from "./reports-client";

export default function SalesReportsPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Sales Reports"
        description="Per-person activity, win rates, cycle times, forecasts and growth — exportable."
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
