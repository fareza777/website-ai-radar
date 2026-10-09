import Link from "next/link";
import { RadarMark } from "@/components/radar-mark";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center py-24 text-center">
      <RadarMark className="size-14 rounded-2xl" />
      <h1 className="mt-6 text-2xl font-semibold tracking-tight">Signal lost</h1>
      <p className="mt-2 text-sm text-muted-foreground">The page you are looking for is not on the radar.</p>
      <Link href="/" className="mt-6 inline-flex h-10 items-center rounded-xl bg-foreground px-5 text-sm font-medium text-background">
        Back to Today
      </Link>
    </div>
  );
}
