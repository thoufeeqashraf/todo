import type { Metadata } from "next";
import { Suspense } from "react";

import { OperatorDashboard } from "@/components/dashboard/operator-dashboard";
import { johannesburgClock, operatorBoard } from "@/lib/operator-preview";
import { getCurrentOperator } from "@/lib/session";

export const metadata: Metadata = {
  title: "Operator dashboard",
  description: "Admin and staff dashboard for the customer app and companies.",
};

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <p className="px-6 py-16 text-sm text-muted-foreground">
          Opening the floor…
        </p>
      }
    >
      <DashboardLoader />
    </Suspense>
  );
}

async function DashboardLoader() {
  const operator = await getCurrentOperator();
  const clock = johannesburgClock();

  return (
    <OperatorDashboard
      username={operator.username}
      role={operator.role}
      greeting={clock.greeting}
      dateLabel={clock.dateLabel}
      board={operatorBoard(operator.role)}
    />
  );
}
