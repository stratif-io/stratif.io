import { useState } from "react";
import { ComponentSection, ComponentRow } from "../components/ComponentSection";
import {
  LoadingState,
  EmptyState,
  QueryError,
  CardLoadingBar,
  NoConnectionScreen,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  toast,
} from "@stratif-io/design-system";

const stubError = new Error("Failed to load data.");

function NotFoundPageDemo() {
  return (
    <div className="flex flex-col items-center justify-center gap-6 bg-background px-4 py-8">
      <div className="rounded-xl bg-primary/5 p-6">
        <svg width="120" height="60" viewBox="0 0 120 60" aria-hidden="true">
          <rect
            x="10"
            y="40"
            width="12"
            height="14"
            rx="2"
            className="fill-muted-foreground/30"
          />
          <rect
            x="28"
            y="28"
            width="12"
            height="26"
            rx="2"
            className="fill-muted-foreground/45"
          />
          <rect
            x="46"
            y="18"
            width="12"
            height="36"
            rx="2"
            className="fill-muted-foreground/60"
          />
          <rect
            x="64"
            y="32"
            width="12"
            height="22"
            rx="2"
            className="fill-muted-foreground/45"
          />
          <rect
            x="82"
            y="10"
            width="12"
            height="44"
            rx="2"
            className="fill-primary"
          />
          <rect
            x="100"
            y="22"
            width="12"
            height="32"
            rx="2"
            className="fill-muted-foreground/60"
          />
          <text
            x="60"
            y="58"
            textAnchor="middle"
            fontSize="7"
            fontFamily="monospace"
            className="fill-muted-foreground"
          >
            no data found
          </text>
        </svg>
      </div>
      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-1">
          Error 404
        </p>
        <h1 className="mb-3 text-2xl font-bold text-foreground">
          Nothing to chart here
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          This page has zero data points — because it doesn&apos;t exist.
        </p>
      </div>
    </div>
  );
}

function UnderConstructionDemo() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="max-w-sm w-full space-y-4 text-center">
        <h2 className="text-xl font-bold tracking-tight">Coming soon</h2>
        <p className="text-sm text-muted-foreground">
          This feature isn&apos;t ready yet.
        </p>
      </div>
    </div>
  );
}

function ErrorBoundaryFallbackDemo() {
  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="text-destructive text-base">
          Something went wrong
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          An unexpected error occurred. This is how the ErrorBoundary fallback
          appears.
        </p>
        <div className="flex gap-2">
          <Button size="sm" variant="outline">
            Reload page
          </Button>
          <Button size="sm" variant="ghost">
            Go home
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function FeedbackSection() {
  const [showError, setShowError] = useState(false);

  return (
    <ComponentSection id="feedback" title="Feedback States">
      <ComponentRow label="LoadingState">
        <div className="border rounded-md w-64 h-32 relative overflow-hidden flex items-center justify-center">
          <LoadingState message="Loading data..." size="sm" />
        </div>
      </ComponentRow>

      <ComponentRow label="EmptyState">
        <div className="border rounded-md w-64">
          <EmptyState title="No data" description="Nothing to display yet." />
        </div>
      </ComponentRow>

      <ComponentRow label="QueryError">
        <div className="border rounded-md w-64">
          <QueryError error={stubError} />
        </div>
      </ComponentRow>

      <ComponentRow label="CardLoadingBar">
        <div className="border rounded-md w-64 p-4 relative overflow-hidden">
          <p className="text-sm">Card with loading bar</p>
          <CardLoadingBar loading />
        </div>
      </ComponentRow>

      <ComponentRow label="UnderConstruction">
        <div className="border rounded-md w-64 overflow-hidden">
          <UnderConstructionDemo />
        </div>
      </ComponentRow>

      <ComponentRow label="NoConnectionScreen">
        <div className="border rounded-md w-full overflow-hidden max-w-xl max-h-72 overflow-y-auto">
          <NoConnectionScreen />
        </div>
      </ComponentRow>

      <ComponentRow label="ErrorBoundary (fallback UI)">
        <div className="w-full max-w-lg">
          {showError ? (
            <ErrorBoundaryFallbackDemo />
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowError(true)}
            >
              Show error boundary fallback
            </Button>
          )}
        </div>
      </ComponentRow>

      <ComponentRow label="Toast">
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={() => toast("Event saved")}
          >
            Default
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => toast.success("Connection added")}
          >
            Success
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => toast.error("Failed to run query")}
          >
            Error
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => toast.warning("Query took longer than expected")}
          >
            Warning
          </Button>
        </div>
      </ComponentRow>

      <ComponentRow label="NotFoundPage">
        <div className="border rounded-md w-full overflow-hidden max-w-4xl max-h-96 overflow-y-auto">
          <NotFoundPageDemo />
        </div>
      </ComponentRow>
    </ComponentSection>
  );
}
