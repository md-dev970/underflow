#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "usage: $0 INPUT_FILE OUTPUT_FILE" >&2
  exit 2
fi

if command -v py >/dev/null; then
  PYTHON_COMMAND=(py -3)
elif command -v python3 >/dev/null; then
  PYTHON_COMMAND=(python3)
elif command -v python >/dev/null; then
  PYTHON_COMMAND=(python)
else
  echo "python3, py, or python is required" >&2
  exit 2
fi

"${PYTHON_COMMAND[@]}" - "$1" "$2" <<'PY'
import pathlib
import re
import sys

source = pathlib.Path(sys.argv[1])
target = pathlib.Path(sys.argv[2])
text = source.read_text(encoding="utf-8", errors="replace")

patterns = [
    (r"(?i)arn:aws:secretsmanager:[^\s\"']+", "[REDACTED_SECRET_ARN]"),
    (r"(?i)\b[A-Z0-9]{20}\b", "[REDACTED_AWS_ACCESS_KEY]"),
    (r"(?i)\beyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b", "[REDACTED_TOKEN]"),
    (r"\b\d{12}\.dkr\.ecr\.[a-z0-9-]+\.amazonaws\.com\b", "[REDACTED_ECR_HOST]"),
    (r"(?i)\b[a-z0-9-]+\.[a-z0-9-]+\.rds\.amazonaws\.com\b", "[REDACTED_RDS_HOST]"),
    (r"\b(?:\d{1,3}\.){3}\d{1,3}\b", "[REDACTED_IPV4]"),
    (r"(?i)\b(?![a-z0-9.+_-]+@example\.invalid\b)[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b", "[REDACTED_EMAIL]"),
    (r"(?i)(terraform\.tfstate(?:\.[^\s\"']+)?)", "[REDACTED_TERRAFORM_STATE]"),
    (r"(?<!\d)\d{12}(?!\d)", "[REDACTED_AWS_ACCOUNT_ID]"),
]

for pattern, replacement in patterns:
    text = re.sub(pattern, replacement, text)

target.parent.mkdir(parents=True, exist_ok=True)
target.write_text(text, encoding="utf-8")

for pattern, _replacement in patterns:
    if re.search(pattern, text):
        raise SystemExit(f"sanitization verification failed for pattern: {pattern}")
PY

echo "Sanitized $1 -> $2"
