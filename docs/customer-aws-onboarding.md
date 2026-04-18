# Customer AWS Onboarding

Underflow expects a fixed customer-side role name for the default onboarding path:

- `UnderflowCostExplorerRead`

That lets the product derive the role ARN from the entered AWS account ID and keeps onboarding simpler for customers.

## What the customer enters into Underflow

- AWS account ID
- External ID

Advanced/manual role ARN entry should only be used for non-standard setups.

## What the customer creates in AWS

### Trusted entity type

- `AWS account`
- `Another AWS account`

The account ID they must trust is the Underflow backend AWS account ID.

### Recommended role name

- `UnderflowCostExplorerRead`

### Trust policy template

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::UNDERFLOW_ACCOUNT_ID:root"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "CUSTOMER_SPECIFIC_EXTERNAL_ID"
        }
      }
    }
  ]
}
```

### Minimum permissions policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ce:GetCostAndUsage"
      ],
      "Resource": "*"
    }
  ]
}
```

Optional later additions:

- `ce:GetDimensionValues`
- `ce:GetCostForecast`

## Notes

- the Underflow AWS account ID is not secret and should be provided to customers as part of onboarding
- customers do not provide long-lived IAM keys to Underflow
- access works only when both sides are configured:
  - Underflow backend can call `sts:AssumeRole`
  - the customer role trusts the Underflow account and external ID
