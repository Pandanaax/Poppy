import React, { PropsWithChildren } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";

export function Layout({ children }: PropsWithChildren) {
  return (
    <div className="relative min-h-screen flex flex-col">
      {/* BACKGROUND LAYER — visible on all devices */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        {/* soft global gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#fff5f2] to-[#f6f8ff]" />

        {/* top-left halo */}
        <div
          className="
            absolute -top-32 -left-32 h-[420px] w-[420px] rounded-full
            bg-[radial-gradient(closest-side,rgba(227,83,53,0.16),transparent_70%)]
            sm:h-[520px] sm:w-[520px]
            lg:h-[720px] lg:w-[720px] lg:-top-40 lg:-left-40
          "
        />

        {/* top-right halo */}
        <div
          className="
            absolute -top-36 -right-16 h-[360px] w-[360px] rounded-full
            bg-[radial-gradient(closest-side,rgba(244,63,94,0.12),transparent_72%)]
            sm:h-[460px] sm:w-[460px]
            lg:h-[640px] lg:w-[640px] lg:-top-44 lg:-right-24
          "
        />
      </div>

      <Header />

      <main className="flex-1 w-full">
        <div className="mx-auto max-w-6xl px-4 py-8">{children}</div>
      </main>

      <Footer />
    </div>
  );
}
