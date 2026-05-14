"use client";

import { useFormState, useFormStatus } from "react-dom";

import { PillButton } from "@attuna/ui/PillButton";

import { acceptInviteAction, type AcceptResult } from "./_actions";

export function AcceptInviteForm({ token }: { token: string }) {
  const [state, action] = useFormState<AcceptResult | null, FormData>(acceptInviteAction, null);

  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="token" value={token} />
      <Submit />
      {state?.ok === false ? (
        <p className="text-rose text-center text-[13px] font-medium" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <PillButton
      type="submit"
      variant="primary"
      size="md"
      disabled={pending}
      aria-busy={pending || undefined}
      style={{ width: "100%" }}
    >
      {pending ? "Joining…" : "Accept and join"}
    </PillButton>
  );
}
