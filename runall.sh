#!/bin/sh

forever stopall
forever start -o /var/log/spell.web.log -e /var/log/spell.web.log -a Cron/web.js
forever start -o /var/log/spell.spider.log -e /var/log/spell.spider.log -a Cron/spider.js
forever start -o /var/log/spell.speller.log -e /var/log/spell.speller.log -a Cron/speller.js

