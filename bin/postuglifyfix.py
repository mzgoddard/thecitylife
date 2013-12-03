#!/usr/bin/env python

import re
import optparse

parser = optparse.OptionParser()
parser.add_option("-f", "--file")
(options, args) = parser.parse_args()

for x in (options.file and isinstance(options.file, list) or [options.file]):
    # read file
    f = open(x)
    s = f.read()
    f.close()

    # Uglify2 parses +(+(expr)) and outputs ++(expr) which is a translation of
    # implicit number type casts to an invalid unary prefix operation.
    s = re.sub(r'\+\+(\w*)\(', '+ +\g<1>(', s)

    # write file
    f = open(x, 'w')
    f.write(s)
