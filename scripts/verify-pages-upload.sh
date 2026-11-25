#!/usr/bin/env bash
set -euo pipefail

# A deploy-only rerun inherits the successful producer's outputs, including its attempt name.
if [[ "$UPLOAD_SHA" != "$GITHUB_SHA" || ! "$ARTIFACT_ID" =~ ^[1-9][0-9]*$ || ! "$PAGES_ARTIFACT" =~ ^github-pages-[1-9][0-9]*$ ]]; then
  echo "::error::Invalid Pages artifact identity from the build job"
  exit 1
fi

for attempt in {1..10}; do
  if ids="$(gh api "repos/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID/artifacts?name=$PAGES_ARTIFACT" \
      --jq '.artifacts | map(select(.expired == false).id) | join(",")')" && [[ "$ids" == "$ARTIFACT_ID" ]]; then
    main_sha="$(gh api "repos/$GITHUB_REPOSITORY/git/ref/heads/main" --jq '.object.sha')"
    if [[ "$main_sha" != "$GITHUB_SHA" ]]; then
      echo "::error::Main has advanced since this Pages artifact was built"
      exit 1
    fi
    echo "Verified $PAGES_ARTIFACT ($ARTIFACT_ID) for $GITHUB_SHA in run $GITHUB_RUN_ID"
    exit 0
  fi
  if (( attempt < 10 )); then sleep 3; fi
done
echo "::error::Pages artifact $PAGES_ARTIFACT ($ARTIFACT_ID) was not uniquely visible"
exit 1
