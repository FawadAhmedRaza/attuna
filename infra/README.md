# Attuna infra

AWS CDK definitions for Attuna's infrastructure. One stack per concern, one environment per deploy.

## Layout

```
infra/
├── bin/attuna.ts          # CDK app entry — instantiates stacks per env
├── lib/cognito-stack.ts   # Cognito user pools (therapist + client)
├── cdk.json               # CDK config + account/region context
└── package.json
```

## Stacks

| Stack                     | What it creates                                                   |
| ------------------------- | ----------------------------------------------------------------- |
| `Attuna-Cognito-Dev`      | Two user pools + app clients (therapist web + client mobile)      |
| `Attuna-Cognito-Staging`  | Same shape as dev; staging account (see `cdk.json` context)       |
| `Attuna-Cognito-Prod`     | Same shape as dev; prod account (see `cdk.json` context)          |

Staging + prod stacks are declared so `cdk synth` and `cdk diff` catch
config drift across environments; their AWS accounts default to the
dev account unless `attuna:account:staging` / `attuna:account:prod`
are set in `cdk.json` context.

## Prerequisites

- Node 20+, pnpm 9+
- AWS CLI configured with profile `attuna-dev` (`aws configure --profile attuna-dev`)
- IAM user has admin or sufficient CDK permissions

## First-time setup (per AWS account)

CDK needs a one-time bootstrap to create the toolkit assets (S3 bucket, IAM
roles) it uses for deploys. This is free — the bucket is empty until you
deploy. Run once per account/region:

```bash
cd infra
AWS_PROFILE=attuna-dev pnpm cdk bootstrap aws://013052902339/us-east-1
```

## Deploy

```bash
cd infra

# See what CloudFormation will create — no AWS calls beyond reading creds
AWS_PROFILE=attuna-dev pnpm synth

# Show diff against deployed state
AWS_PROFILE=attuna-dev pnpm diff

# Deploy (interactive — review and approve IAM changes)
AWS_PROFILE=attuna-dev pnpm deploy
```

After deploy, CloudFormation prints four outputs. Copy them into
`apps/web/.env.local`:

```
COGNITO_USER_POOL_ID_THERAPIST=<TherapistUserPoolId>
COGNITO_CLIENT_ID_THERAPIST=<TherapistUserPoolClientId>
COGNITO_USER_POOL_ID_CLIENT=<ClientUserPoolId>
COGNITO_CLIENT_ID_CLIENT=<ClientUserPoolClientId>
```

## Tearing down

```bash
AWS_PROFILE=attuna-dev pnpm cdk destroy Attuna-Cognito-Dev
```

⚠️ Both pools have `RemovalPolicy.RETAIN`, so `cdk destroy` will fail
unless you first change the policy and redeploy. This is intentional —
deleting a pool wipes every user in it.

## Notes

- **Account ID is in `cdk.json`**, not env vars. It's not a secret (it's in
  every ARN you produce) but it's also not something we want to type each
  time.
- **No SES integration yet.** Pools use Cognito's default email sender,
  which has tight quotas (50/day) and a generic `no-reply@verificationemail.com`
  address. Fine for dev. We'll switch to SES before staging.
- **No Hosted UI / custom domain.** We're using Cognito as an auth backend
  only; sign-up/sign-in UI is built into `apps/web` and (M2.3b.3) `apps/mobile`.
- **MFA on therapist pool is OPTIONAL** for dev. Required-MFA needs to be
  set before prod — flagged in ROADMAP M1.
- **Client pool ↔ our DB link.** The client user pool carries an immutable
  custom attribute `custom:client_user_id` that points at a `client_user.id`
  in Postgres. The mobile app signs up to Cognito, then calls our API with
  `{ inviteToken, idToken }`; the API verifies the invite, sets
  `client_user.cognito_sub = <new sub>`, and stamps `custom:client_user_id`
  on the Cognito user via `AdminUpdateUserAttributes`. After that, every
  Cognito token carries the claim so the API doesn't have to look up the
  row to know which patient is making the request.
