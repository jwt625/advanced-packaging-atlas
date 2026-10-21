#!/bin/sh
# Resource-capped runner for the L5 reference scripts (shared machine): nice 10, single-threaded BLAS, peak RSS
# reported by /usr/bin/time -l, and an RSS watchdog that kills this lane's scripts above RSS_LIMIT_KB (default 4 GB).
# Usage: ./run.sh scripts/<script>.py ARGS...
cd "$(dirname "$0")" || exit 1
unset VIRTUAL_ENV
export OMP_NUM_THREADS=1 MKL_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 VECLIB_MAXIMUM_THREADS=1 NUMEXPR_NUM_THREADS=1
LIM=${RSS_LIMIT_KB:-4194304}
( while :; do
    ps -axo pid=,rss=,command= | grep "validation/reference/.venv" | grep "scripts/ref_" | grep -v grep | while read -r pid rss rest; do
      if [ "$rss" -gt "$LIM" ]; then echo "WATCHDOG kill $pid rss=${rss}KB"; kill "$pid"; fi
    done
    sleep 1
  done ) &
WD=$!
trap 'kill $WD 2>/dev/null' EXIT
trap 'kill $WD 2>/dev/null; exit 1' INT TERM
/usr/bin/time -l nice -n 10 uv run --no-sync python "$@"
