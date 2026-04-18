export const STANDARD_AWS_ROLE_NAME = "UnderflowCostExplorerRead";

export const buildStandardRoleArn = (awsAccountId: string): string =>
  `arn:aws:iam::${awsAccountId}:role/${STANDARD_AWS_ROLE_NAME}`;
