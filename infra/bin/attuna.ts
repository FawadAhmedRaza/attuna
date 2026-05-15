#!/usr/bin/env node
import { App } from "aws-cdk-lib";
import { CognitoStack } from "../lib/cognito-stack";

// Each environment owns its own AWS account in the production deploy
// model (per ARCHITECTURE §6 — dev / staging / prod are separate
// accounts). Today only the dev account is provisioned; the staging
// and prod stack instances are declared so `cdk synth` + `cdk diff`
// catch config drift early. Their accounts live in cdk.json context
// keyed by attuna:account:<env>; both currently fall back to the dev
// account so `synth` works locally for everyone without coordination.

const app = new App();

const region =
  process.env.CDK_DEFAULT_REGION ?? app.node.tryGetContext("attuna:region") ?? "us-east-1";

function accountFor(envName: "dev" | "staging" | "prod"): string {
  const envSpecific = app.node.tryGetContext(`attuna:account:${envName}`);
  if (envSpecific) return envSpecific as string;
  const fallback = process.env.CDK_DEFAULT_ACCOUNT ?? app.node.tryGetContext("attuna:account");
  if (!fallback) {
    throw new Error(
      `No account for env "${envName}". Set CDK_DEFAULT_ACCOUNT, or attuna:account / attuna:account:${envName} in cdk.json.`,
    );
  }
  return fallback as string;
}

new CognitoStack(app, "Attuna-Cognito-Dev", {
  envName: "dev",
  env: { account: accountFor("dev"), region },
  description: "Attuna Cognito user pools (therapist + client) — dev",
});

new CognitoStack(app, "Attuna-Cognito-Staging", {
  envName: "staging",
  env: { account: accountFor("staging"), region },
  description: "Attuna Cognito user pools (therapist + client) — staging",
});

new CognitoStack(app, "Attuna-Cognito-Prod", {
  envName: "prod",
  env: { account: accountFor("prod"), region },
  description: "Attuna Cognito user pools (therapist + client) — prod",
});
