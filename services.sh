#!/bin/sh

for svc in "web" "fetcher" "fetcher2" "speller" "link-checker"
do
  service speller-$svc $1
done
