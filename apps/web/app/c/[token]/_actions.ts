"use server";

// M2.3c retired the cookie-based web accept flow. The /c/[token] page
// is now informational — it tells the invitee to install the mobile
// app, where /api/c/link consumes the invite under a real Cognito
// identity (M2.3b.3).
//
// Empty file intentionally retained: tooling (revalidatePath, lint-
// staged) sometimes references this path. If you find no consumers
// after another slice or two, it's safe to delete the file entirely.

export {};
