import {
  defaultShouldDehydrateQuery,
  MutationCache,
  QueryCache,
  QueryClient,
} from "@tanstack/react-query";
import { signOut } from "next-auth/react";
import SuperJSON from "superjson";

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 30 * 1000,
      },
      dehydrate: {
        serializeData: SuperJSON.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
      hydrate: {
        deserializeData: SuperJSON.deserialize,
      },
    },
    mutationCache: new MutationCache({
      onError: (err: unknown) => {
        if (
          (err as { data?: { code?: string } })?.data?.code === "UNAUTHORIZED"
        ) {
          void signOut({ redirectTo: "/login?error=SessionExpired" });
        }
      },
    }),
    queryCache: new QueryCache({
      onError: (err: unknown) => {
        if (
          (err as { data?: { code?: string } })?.data?.code === "UNAUTHORIZED"
        ) {
          void signOut({ redirectTo: "/login?error=SessionExpired" });
        }
      },
    }),
  });
