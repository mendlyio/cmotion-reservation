"use client";

import * as Sentry from "@sentry/nextjs";
import DefaultGlobalError from "next/dist/client/components/builtin/global-error";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
  reset?: () => void;
  retry?: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return <DefaultGlobalError error={error} />;
}
