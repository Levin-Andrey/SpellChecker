#!/bin/sh

for svc in "web" "spider" "spider2" "speller"
do
  service speller-$svc $1
done
