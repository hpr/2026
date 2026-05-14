#!/bin/bash
set -e

REMOTE="habs@ma.sdf.org:/meta/h/habs/habserv"
MOUNT_POINT="$(dirname "$0")/habserv"

mkdir -p "$MOUNT_POINT"

if mountpoint -q "$MOUNT_POINT"; then
  echo "Already mounted at $MOUNT_POINT"
else
  sshfs "$REMOTE" "$MOUNT_POINT" -o reconnect,ServerAliveInterval=15,ServerAliveCountMax=3
  echo "Mounted $REMOTE -> $MOUNT_POINT"
fi
