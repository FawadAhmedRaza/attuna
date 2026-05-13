#!/usr/bin/env node
import { App } from "aws-cdk-lib";
import { CognitoStack } from "../lib/cognito-stack";

const app = new App();

const account = process.env.CDK_DEFAULT_ACCOUNT ?? app.node.tryGetContext("attuna:account");
const region = process.env.CDK_DEFAULT_REGION ?? app.node.tryGetContext("attuna:region");

if (!account || !region) {
  throw new Error(
    "Account/region not resolved. Set CDK_DEFAULT_ACCOUNT and CDK_DEFAULT_REGION, " +
      "or attuna:account / attuna:region in cdk.json context.",
  );
}

new CognitoStack(app, "Attuna-Cognito-Dev", {
  envName: "dev",
  env: { account, region },
  description: "Attuna Cognito user pools (therapist + client) — dev",
});
