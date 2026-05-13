#!/bin/bash
set -euo pipefail

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
  CREATE DATABASE attuna_test;
  GRANT ALL PRIVILEGES ON DATABASE attuna_test TO $POSTGRES_USER;
EOSQL
