import * as Sentry from "@sentry/nextjs";
import { prisma } from "@/lib/prisma";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    integrations: [
      new Sentry.Integrations.Prisma({ client: prisma }),
    ],

    beforeSend(event, hint) {
      if (event.request) {
        delete event.request.cookies;
        delete event.request.headers;
      }
      return event;
    },
  });
}
