#!/bin/sh

for svc in "web" "spider" "speller"
do
  service speller-$svc restart
done
