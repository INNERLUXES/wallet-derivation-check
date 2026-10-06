# 1. Read no clock, and keep dates out of the repository

## Status

Accepted

## Context

A check of wallet derivation paths has no use for the calendar, but a tool can still let it in: a report stamped with
the time of the run, a note on when a BIP or a SLIP was last changed, the date a coin type was registered. Each of these
would make the same configuration give a different output on a different day, so the saved output of the examples could
never be compared with a new run, and two people reading the same commit could see two reports.

The checks do not need a date. Whether a purpose matches its address type, whether a coin type is the SLIP-44 number of
its coin and whether a level is hardened can all be read from the configuration. The public pages the checks rest on
are named by addresses that hold no year: the BIP and SLIP files in their repositories.

## Decision

1. The tool reads no clock, no time zone and no locale. It never prints the current time and never says when a page, a
   release or a version was published. The same file gives the same output on every machine and on every day.
2. No document, example or test of this repository holds a date or a number that reads like a year: not the licence,
   not the changelog, not the documents, not the comments of the code, not the examples. `npm run check` and a test fail
   on any word of four digits that starts with 19 or 20. The saved copies of the public pages under research/sources are
   the pages' own words and are the one place the check does not read for prose; even so, the lines that carry a date
   (the header line of each BIP that names the day it was assigned, the header line of each SLIP that names the day it
   was created, and the list of dated changes at the top of BIP-32) and the rows of the SLIP-44 table whose number or
   name reads like a year were left out of the copies, so the test that reads every file for a year passes over them
   too. research/sources.md lists every line that was left out.
3. A version, a coin type, an index or the number of a standard is not a year and is not caught: 1.0.0, Node 22, coin
   type 501, the index 2147483647, BIP-44 and SLIP-0044 hold no year. A test of test/repo.test.js runs the pattern over
   such values and checks that none of them is caught, and that a year in the same place still is.
4. The sources are chosen with addresses that hold no year, and the notes on them name no publication date.

## Consequences

- The output of a run can be saved in the repository (`examples/output`) and compared on every change, because it does
  not move with the calendar.
- The report holds no date and no deadline.
- The examples use coin types, accounts and gap limits that do not read like a year, and a check catches one that does.
  A coin whose SLIP-44 number reads like a year cannot be added to the table of coins without changing this decision.
