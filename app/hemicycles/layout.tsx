import { ChamberNav } from "@/components/ChamberNav";

export default function HemicyclesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="border-b border-rule bg-surface/60">
        <div className="mx-auto flex max-w-7xl items-center px-4 py-2.5 sm:px-6">
          <ChamberNav />
        </div>
      </div>
      {children}
    </>
  );
}
