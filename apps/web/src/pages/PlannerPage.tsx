// apps/web/src/pages/PlannerPage.tsx
import React from "react";
import { PlannerForm } from "../components/PlannerForm";

export function PlannerPage() {
  return (
    <div className="container mx-auto max-w-6xl p-4 lg:p-6">
      <PlannerForm />
    </div>
  );
}
