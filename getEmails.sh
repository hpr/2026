#!/bin/bash
set -e

if [ -z "$1" ]; then
  echo "Usage: $0 <meet>"
  echo "Example: $0 brussels25"
  exit 1
fi

MEET="$1"

MAX_ID=$(ssh habs@ma.sdf.org "sqlite3 ~/db/fantasy1500.db \"SELECT COALESCE(MAX(userid),0) FROM picks WHERE meet = '$MEET';\"")

ssh habs@ma.sdf.org "sqlite3 -header -csv ~/db/fantasy1500.db \"select id,name,email from users where id > $MAX_ID;\"" > emails.csv

echo "Users after id $MAX_ID (no picks for $MEET) written to emails.csv"
wc -l emails.csv
