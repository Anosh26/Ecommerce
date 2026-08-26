#!/usr/bin/env bash

echo "Stopping and removing monolithic containers..."

docker stop paaptol-website paaptol-db 2>/dev/null || true
docker rm paaptol-website paaptol-db 2>/dev/null || true
docker network rm paaptol-monolith-net 2>/dev/null || true

echo "Cleanup completed successfully!"
