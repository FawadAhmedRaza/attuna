import { Duration, RemovalPolicy, Stack, StackProps, CfnOutput } from "aws-cdk-lib";
import {
  AccountRecovery,
  Mfa,
  StringAttribute,
  UserPool,
  UserPoolClient,
  UserPoolClientIdentityProvider,
  VerificationEmailStyle,
} from "aws-cdk-lib/aws-cognito";
import { Construct } from "constructs";

export interface CognitoStackProps extends StackProps {
  readonly envName: "dev" | "staging" | "prod";
}

export class CognitoStack extends Stack {
  public readonly therapistUserPool: UserPool;
  public readonly therapistUserPoolClient: UserPoolClient;
  public readonly clientUserPool: UserPool;
  public readonly clientUserPoolClient: UserPoolClient;

  constructor(scope: Construct, id: string, props: CognitoStackProps) {
    super(scope, id, props);

    const { envName } = props;

    // ── Therapist pool ──────────────────────────────────────────────
    // PHI-access tier. Stronger password, MFA optional now (we'll
    // require it before prod). Self-signup enabled in dev so we can
    // create test accounts without going through the console.
    this.therapistUserPool = new UserPool(this, "TherapistUserPool", {
      userPoolName: `attuna-therapist-${envName}`,
      selfSignUpEnabled: envName !== "prod",
      signInAliases: { email: true, username: false },
      signInCaseSensitive: false,
      standardAttributes: {
        email: { required: true, mutable: true },
        fullname: { required: false, mutable: true },
      },
      autoVerify: { email: true },
      userVerification: {
        emailSubject: "Verify your Attuna account",
        emailBody:
          "Welcome to Attuna. Your verification code is {####}. " + "It expires in 24 hours.",
        emailStyle: VerificationEmailStyle.CODE,
      },
      passwordPolicy: {
        minLength: 12,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
        tempPasswordValidity: Duration.days(3),
      },
      mfa: Mfa.OPTIONAL,
      mfaSecondFactor: { sms: false, otp: true },
      accountRecovery: AccountRecovery.EMAIL_ONLY,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    this.therapistUserPoolClient = this.therapistUserPool.addClient("TherapistWebClient", {
      userPoolClientName: `attuna-therapist-web-${envName}`,
      authFlows: {
        // USER_PASSWORD_AUTH is fine for M1 dev (Next.js server proxies sign-in
        // over TLS). Before staging we switch to SRP via amazon-cognito-identity-js
        // so the password never reaches our server.
        userSrp: true,
        userPassword: envName !== "prod",
        adminUserPassword: false,
        custom: false,
      },
      preventUserExistenceErrors: true,
      supportedIdentityProviders: [UserPoolClientIdentityProvider.COGNITO],
      accessTokenValidity: Duration.minutes(60),
      idTokenValidity: Duration.minutes(60),
      refreshTokenValidity: Duration.days(30),
      enableTokenRevocation: true,
      generateSecret: false,
    });

    // ── Client pool ─────────────────────────────────────────────────
    // Lower-privilege; clients only see their own entries. M2.3b.3
    // mobile flow:
    //   1. Mobile opens /c/[token] deep link, parses the invite token.
    //   2. Mobile signs up against this pool (email + password, SRP).
    //   3. Cognito sends a verification code; user confirms.
    //   4. Mobile calls /api/c/link with { inviteToken, idToken } —
    //      our API verifies the token, sets client_user.cognito_sub =
    //      <new sub>, and AdminUpdateUserAttributes the custom claim
    //      `custom:client_user_id` to our DB row id.
    //   5. Subsequent Cognito tokens carry the claim, so the API
    //      doesn't have to round-trip the DB to know which client_user
    //      is making a request.
    //
    // self-signup is ON for M2.3b but the post-confirmation link step
    // gates membership. A user who confirms without redeeming an
    // invite has no client_user row and the API rejects all PHI calls.
    this.clientUserPool = new UserPool(this, "ClientUserPool", {
      userPoolName: `attuna-client-${envName}`,
      selfSignUpEnabled: true,
      signInAliases: { email: true, username: false },
      signInCaseSensitive: false,
      standardAttributes: {
        email: { required: true, mutable: true },
        // No fullname — display_name lives in our `client` row, set by
        // the therapist. We keep Cognito profile data minimal so it
        // can't drift from the therapist-set canonical identifier.
      },
      // `custom:client_user_id` is the immutable bridge from a Cognito
      // sub to a `client_user.id` in our Postgres. The API stamps it
      // once during /api/c/link; mutable=false prevents a compromised
      // session from re-attaching to a different patient. Min/max
      // bound the UUID length so the stamp is a no-op if it's already
      // set.
      customAttributes: {
        client_user_id: new StringAttribute({ minLen: 36, maxLen: 36, mutable: false }),
      },
      autoVerify: { email: true },
      userVerification: {
        emailSubject: "Welcome to Attuna",
        emailBody: "Your therapist invited you to Attuna. " + "Your verification code is {####}.",
        emailStyle: VerificationEmailStyle.CODE,
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
        tempPasswordValidity: Duration.days(7),
      },
      mfa: Mfa.OFF,
      accountRecovery: AccountRecovery.EMAIL_ONLY,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    this.clientUserPoolClient = this.clientUserPool.addClient("ClientMobileClient", {
      userPoolClientName: `attuna-client-mobile-${envName}`,
      authFlows: {
        // SRP is the only client-side flow we enable. The mobile app
        // ships amazon-cognito-identity-js (M2.3b.3) so the password
        // never reaches our servers. USER_PASSWORD_AUTH is also off in
        // dev to keep the dev/prod surfaces identical — Expo handles
        // SRP fine on simulators.
        userSrp: true,
        userPassword: false,
        adminUserPassword: false,
        custom: false,
      },
      preventUserExistenceErrors: true,
      supportedIdentityProviders: [UserPoolClientIdentityProvider.COGNITO],
      accessTokenValidity: Duration.minutes(60),
      idTokenValidity: Duration.minutes(60),
      refreshTokenValidity: Duration.days(60),
      enableTokenRevocation: true,
      generateSecret: false,
    });

    // ── Outputs ─────────────────────────────────────────────────────
    // These are the values to paste into apps/web/.env.local.
    new CfnOutput(this, "TherapistUserPoolId", {
      value: this.therapistUserPool.userPoolId,
      description: "COGNITO_USER_POOL_ID_THERAPIST",
    });
    new CfnOutput(this, "TherapistUserPoolClientId", {
      value: this.therapistUserPoolClient.userPoolClientId,
      description: "COGNITO_CLIENT_ID_THERAPIST",
    });
    new CfnOutput(this, "ClientUserPoolId", {
      value: this.clientUserPool.userPoolId,
      description: "COGNITO_USER_POOL_ID_CLIENT",
    });
    new CfnOutput(this, "ClientUserPoolClientId", {
      value: this.clientUserPoolClient.userPoolClientId,
      description: "COGNITO_CLIENT_ID_CLIENT",
    });
  }
}
