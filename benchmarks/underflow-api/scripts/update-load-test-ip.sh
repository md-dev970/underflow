#!/usr/bin/env bash
set -euo pipefail

for command in curl jq sed terraform; do
  command -v "$command" >/dev/null 2>&1 || {
    echo "$command is required" >&2
    exit 2
  }
done

REPO_ROOT="${REPO_ROOT:-$(git rev-parse --show-toplevel)}"
TF_ROOT="${TF_ROOT:-$REPO_ROOT/infra/terraform/envs/api-benchmark}"
TFVARS="$TF_ROOT/terraform.tfvars"
PLAN_NAME="ip-update.tfplan"

[[ -f "$TFVARS" ]] || {
  echo "Missing $TFVARS" >&2
  exit 2
}

PUBLIC_IP="$(curl --noproxy '*' --fail --silent --show-error \
  https://checkip.amazonaws.com | tr -d '\r\n')"

if [[ ! "$PUBLIC_IP" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]; then
  echo "Public IP lookup returned an invalid IPv4 address: $PUBLIC_IP" >&2
  exit 1
fi

IFS=. read -r -a octets <<< "$PUBLIC_IP"
for octet in "${octets[@]}"; do
  if ((10#$octet > 255)); then
    echo "Public IP lookup returned an invalid IPv4 address: $PUBLIC_IP" >&2
    exit 1
  fi
done

CURRENT_CIDR="$(sed -nE 's/^[[:space:]]*load_test_cidr[[:space:]]*=[[:space:]]*"([^"]+)".*/\1/p' "$TFVARS")"
NEW_CIDR="$PUBLIC_IP/32"

if [[ "$CURRENT_CIDR" == "$NEW_CIDR" ]]; then
  echo "ALB already allows the current public IP: $NEW_CIDR"
else
  cp "$TFVARS" "$TFVARS.bak"
  sed -i \
    "s|^[[:space:]]*load_test_cidr[[:space:]]*=.*$|load_test_cidr = \"$NEW_CIDR\"|" \
    "$TFVARS"
  echo "Updated load_test_cidr: ${CURRENT_CIDR:-<missing>} -> $NEW_CIDR"
fi

terraform -chdir="$TF_ROOT" plan -out="$PLAN_NAME"

PLAN_JSON="$(terraform -chdir="$TF_ROOT" show -json "$PLAN_NAME")"
if ! jq -e '
  [.resource_changes[]?
    | select(.mode == "managed" and .change.actions != ["no-op"])] as $changes
  | ($changes | length) <= 1
    and all($changes[];
      .address == "aws_security_group.alb"
      and .change.actions == ["update"])
' >/dev/null <<< "$PLAN_JSON"; then
  echo "Refusing to apply: the plan changes resources other than aws_security_group.alb." >&2
  terraform -chdir="$TF_ROOT" show -no-color "$PLAN_NAME" >&2
  if [[ -f "$TFVARS.bak" ]]; then
    mv "$TFVARS.bak" "$TFVARS"
  fi
  rm -f "$TF_ROOT/$PLAN_NAME"
  exit 1
fi

CONFIRM_IP="$(curl --noproxy '*' --fail --silent --show-error \
  https://checkip.amazonaws.com | tr -d '\r\n')"
if [[ "$CONFIRM_IP" != "$PUBLIC_IP" ]]; then
  echo "Public IP changed during planning ($PUBLIC_IP -> $CONFIRM_IP); refusing to apply." >&2
  if [[ -f "$TFVARS.bak" ]]; then
    mv "$TFVARS.bak" "$TFVARS"
  fi
  rm -f "$TF_ROOT/$PLAN_NAME"
  exit 1
fi

terraform -chdir="$TF_ROOT" apply "$PLAN_NAME"
rm -f "$TF_ROOT/$PLAN_NAME" "$TFVARS.bak"

BASE_URL="$(terraform -chdir="$TF_ROOT" output -raw api_base_url | tr -d '\r')"
echo "Applied ALB ingress CIDR $NEW_CIDR"
curl --fail --silent --show-error "$BASE_URL/api/v1/health"
echo
echo "Health check passed: $BASE_URL/api/v1/health"
