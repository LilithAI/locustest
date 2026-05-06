import { useLocation } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import TopProgressBar from "./TopProgressBar";

/**
 * Route-aware Suspense fallback. Replaces the old "blank screen + thin yellow
 * bar" with a content-shaped skeleton so navigations feel instant. Pure
 * presentation — no hooks, no data, no heavy imports.
 */

type Shape =
  | "app"
  | "barList"
  | "barChallenge"
  | "barLeaderboard"
  | "directory"
  | "cardGrid"
  | "article"
  | "applications"
  | "profile"
  | "auth"
  | "generic";

const shapeRules: Array<[RegExp, Shape]> = [
  [/^\/app/, "app"],
  [/^\/the-bar\/challenge/, "barChallenge"],
  [/^\/the-bar\/(leaderboard|history)/, "barLeaderboard"],
  [/^\/the-bar/, "barList"],
  [/^\/directory/, "directory"],
  [/^\/playbook\/.+/, "article"],
  [/^\/(playbook|resources|tools)/, "cardGrid"],
  [/^\/applications/, "applications"],
  [/^\/(profile\/edit|u\/)/, "profile"],
  [/^\/(auth|choose-username|reset-password)/, "auth"],
];

function getShape(pathname: string): Shape {
  for (const [re, shape] of shapeRules) {
    if (re.test(pathname)) return shape;
  }
  return "generic";
}

const Card = ({ className = "" }: { className?: string }) => (
  <div
    className={`border-2 border-border bg-card shadow-[3px_3px_0_0_hsl(var(--border))] p-4 ${className}`}
  >
    <Skeleton className="h-4 w-1/3 mb-3" />
    <Skeleton className="h-3 w-full mb-2" />
    <Skeleton className="h-3 w-5/6 mb-2" />
    <Skeleton className="h-3 w-2/3" />
  </div>
);

function AppShape() {
  return (
    <>
      {/* Identity row */}
      <div className="flex items-center gap-4 border-2 border-border bg-card p-4 shadow-[3px_3px_0_0_hsl(var(--border))]">
        <Skeleton className="h-14 w-14 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      {/* Strength meter */}
      <div className="border-2 border-border bg-card p-5 shadow-[3px_3px_0_0_hsl(var(--border))] space-y-3">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-4 w-full" />
      </div>
      {/* Activity heatmap */}
      <div className="border-2 border-border bg-card p-5 shadow-[3px_3px_0_0_hsl(var(--border))]">
        <Skeleton className="h-3 w-24 mb-3" />
        <Skeleton className="h-28 w-full" />
      </div>
      {/* 3-pane grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="h-64" />
        <Card className="h-64" />
        <Card className="h-64" />
      </div>
    </>
  );
}

function BarListShape() {
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="border-2 border-border bg-card p-4 shadow-[3px_3px_0_0_hsl(var(--border))]"
          >
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-6 w-12" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="h-44" />
        ))}
      </div>
    </>
  );
}

function BarChallengeShape() {
  return (
    <>
      <div className="border-2 border-border bg-card p-6 shadow-[3px_3px_0_0_hsl(var(--border))] space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="border-2 border-border bg-card p-4 shadow-[3px_3px_0_0_hsl(var(--border))]"
          >
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
    </>
  );
}

function BarLeaderboardShape() {
  return (
    <>
      <Skeleton className="h-8 w-48" />
      <div className="border-2 border-border bg-card shadow-[3px_3px_0_0_hsl(var(--border))] divide-y-2 divide-border">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton className="h-6 w-6" />
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </>
  );
}

function DirectoryShape() {
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24" />
        ))}
      </div>
      <Skeleton className="h-72 w-full" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="h-40" />
        ))}
      </div>
    </>
  );
}

function CardGridShape() {
  return (
    <>
      <div className="space-y-2">
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="h-48" />
        ))}
      </div>
    </>
  );
}

function ArticleShape() {
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-10 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="space-y-3 pt-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className={`h-3 ${i % 3 === 2 ? "w-2/3" : "w-full"}`} />
        ))}
      </div>
    </div>
  );
}

function ApplicationsShape() {
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="border-2 border-border bg-card p-4 shadow-[3px_3px_0_0_hsl(var(--border))]"
          >
            <Skeleton className="h-3 w-16 mb-2" />
            <Skeleton className="h-6 w-12" />
          </div>
        ))}
      </div>
      <div className="border-2 border-border bg-card shadow-[3px_3px_0_0_hsl(var(--border))] divide-y-2 divide-border">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3">
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </>
  );
}

function ProfileShape() {
  return (
    <>
      <div className="flex items-center gap-4 border-2 border-border bg-card p-4 shadow-[3px_3px_0_0_hsl(var(--border))]">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="h-32" />
      ))}
    </>
  );
}

function GenericShape() {
  return (
    <>
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-4 w-2/3" />
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="h-28" />
      ))}
    </>
  );
}

function AuthShape() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md border-2 border-border bg-card p-6 shadow-[6px_6px_0_0_hsl(var(--border))] space-y-4">
        <Skeleton className="h-7 w-1/2 mx-auto" />
        <Skeleton className="h-3 w-2/3 mx-auto" />
        <div className="space-y-3 pt-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    </div>
  );
}

const shapeMap: Record<Shape, () => JSX.Element> = {
  app: AppShape,
  barList: BarListShape,
  barChallenge: BarChallengeShape,
  barLeaderboard: BarLeaderboardShape,
  directory: DirectoryShape,
  cardGrid: CardGridShape,
  article: ArticleShape,
  applications: ApplicationsShape,
  profile: ProfileShape,
  auth: AuthShape,
  generic: GenericShape,
};

export default function RouteSkeleton() {
  const { pathname } = useLocation();
  const shape = getShape(pathname);
  const ShapeComponent = shapeMap[shape];

  // Auth routes live outside <Layout> — render full-screen, no page padding.
  if (shape === "auth") {
    return (
      <>
        <TopProgressBar />
        <ShapeComponent />
      </>
    );
  }

  return (
    <>
      <TopProgressBar />
      <div
        className="min-h-screen px-4 pt-24 pb-10"
        role="status"
        aria-label="Loading"
      >
        <div className="max-w-6xl mx-auto space-y-6">
          <ShapeComponent />
        </div>
      </div>
    </>
  );
}
