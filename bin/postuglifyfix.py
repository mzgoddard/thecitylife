#!/usr/bin/env python

import sys
import re
import optparse

parser = optparse.OptionParser()
parser.add_option("-f", "--file")
(options, args) = parser.parse_args()

def printcolor(s,*args):
    COLORS = {
        "red": "\x1b[31m",
        "green": "\x1b[32m"
    }

    color = "green"
    if len(args) > 0:
        color = args[0]

    if isinstance(color,str):
        if not re.match(r"^\\x", color):
            color = COLORS[ color ]
    else:
        color = "\x1b[31m"

    if sys.stdout.isatty():
        sys.stdout.write("{0}{1}\x1b[0m".format(color, s))
    else:
        sys.stdout.write(s)

if options.file == None:
    printcolor("No file(s) listed to fix.\n\n")
    parser.print_help()
    sys.exit(1)

for x in (options.file and isinstance(options.file, list) or [options.file]):
    if not isinstance(x, str):
        continue

    # read file
    printcolor("Fixing {0}\n".format(x))
    f = open(x)
    s = f.read()
    f.close()

    # Uglify2 parses +(+(expr)) and outputs ++(expr) which is a translation of
    # implicit number type casts to an invalid unary prefix operation.
    s = re.sub(r'\+\+(\w*)\(', '+ +\g<1>(', s)

    # write file
    f = open(x, 'w')
    f.write(s)
