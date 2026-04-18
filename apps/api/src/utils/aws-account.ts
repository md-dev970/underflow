import { AppError } from "./app-error.js";

export const STANDARD_AWS_ROLE_NAME = "UnderflowCostExplorerRead";

export const buildStandardRoleArn = (awsAccountId: string): string =>
  `arn:aws:iam::${awsAccountId}:role/${STANDARD_AWS_ROLE_NAME}`;

const toMessage = (error: unknown): string =>
  error instanceof Error ? error.message : "Unknown AWS error";

export const toAssumeRoleError = (
  error: unknown,
  details: { awsAccountId: string; roleArn: string },
): AppError => {
  const cause = toMessage(error);
  const name =
    typeof error === "object" && error !== null && "name" in error
      ? String(error.name)
      : "";

  if (name === "AccessDenied" || name === "AccessDeniedException") {
    const externalIdRelated = cause.toLowerCase().includes("externalid");

    return new AppError(
      externalIdRelated
        ? "Unable to assume the AWS role. Check the trust policy and external ID."
        : "Unable to assume the AWS role. Check the trust policy and account ID.",
      400,
      { ...details, cause },
      externalIdRelated ? "aws_external_id_invalid" : "aws_assume_role_denied",
    );
  }

  return new AppError(
    "Unable to assume the configured AWS role",
    400,
    { ...details, cause },
    "aws_assume_role_failed",
  );
};

export const toCostExplorerError = (
  error: unknown,
  details: { awsAccountId: string; roleArn: string },
): AppError => {
  const cause = toMessage(error);
  const name =
    typeof error === "object" && error !== null && "name" in error
      ? String(error.name)
      : "";

  if (name === "AccessDeniedException" || name === "AccessDenied") {
    return new AppError(
      "Cost Explorer access was denied for this role. Confirm the role has Cost Explorer read permissions.",
      502,
      { ...details, cause },
      "aws_cost_explorer_denied",
    );
  }

  if (name === "DataUnavailableException" || cause.toLowerCase().includes("data unavailable")) {
    return new AppError(
      "Cost Explorer does not have data ready for this account yet. Wait for billing data to appear, then sync again.",
      502,
      { ...details, cause },
      "aws_cost_data_unavailable",
    );
  }

  if (
    cause.toLowerCase().includes("cost explorer is not enabled") ||
    cause.toLowerCase().includes("activate cost explorer")
  ) {
    return new AppError(
      "Cost Explorer is not enabled in this AWS account yet.",
      502,
      { ...details, cause },
      "aws_cost_explorer_not_enabled",
    );
  }

  return new AppError(
    "Unable to fetch AWS cost data from Cost Explorer",
    502,
    { ...details, cause },
    "aws_cost_explorer_failed",
  );
};
