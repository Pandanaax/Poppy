import React from "react";
import { Layout } from "./components/Layout";
import { PlannerPage } from "./pages/PlannerPage";
import { Toaster } from "react-hot-toast";

export default function App() {
  return (
    <Layout>
      <PlannerPage />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: "#111827",
            color: "#fff",
            borderRadius: "0.5rem",
            fontSize: "0.875rem",
          },
        }}
      />
    </Layout>
  );
}
