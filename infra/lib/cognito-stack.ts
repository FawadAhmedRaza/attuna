import { Duration, RemovalPolicy, Stack, StackProps, CfnOutput } from "aws-cdk-lib";
import {
  AccountRecovery,
  Mfa,
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
        userSrp: true,
        userPassword: false,
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
    // Lower-privilege; clients only see their own entries. Self-signup
    // disabled — therapists invite clients via our own invite token
    // flow (lands in M2). For now the pool exists but has no entry
    // path; we'll create users via AdminCreateUser when invites ship.
    this.clientUserPool = new UserPool(this, "ClientUserPool", {
      userPoolName: `attuna-client-${envName}`,
      selfSignUpEnabled: false,
      signInAliases: { email: true, username: false },
      signInCaseSensitive: false,
      standardAttributes: {
        email: { required: true, mutable: true },
        fullname: { required: false, mutable: true },
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
