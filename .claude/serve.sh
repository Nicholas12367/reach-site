#!/bin/bash
cd /Users/nicholasconnelly/Applications/reachscreens-website
exec python3 -m http.server "${PORT:-8090}"
