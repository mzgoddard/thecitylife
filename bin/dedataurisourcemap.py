#!/usr/bin/env python

import re
import argparse
import base64

parser = argparse.ArgumentParser()
parser.add_argument("--file", type=str, nargs="+")
options = parser.parse_args()

if options.file == None:
    print("No file(s) listed to fix.\n\n")
    parser.print_help()
    sys.exit(1)

for x in (options.file if isinstance(options.file, list) else [options.file]):
    # read file
    print("Fixing {0}".format(x))
    f = open(x)
    s = f.read()
    f.close()

    match = re.search(r'//[#@] sourceMappingURL=data:application/json;base64,(.*)\n?', s)
    if match:
        datauri = match.group(1)
        datauri = base64.b64decode(datauri)
        outputPath = x + '.map'
        f = open(outputPath, 'w')
        f.write(datauri)
        f.close()

        # x[x.rfind('/') + 1:] + '.map'
        s = s[:match.start()] + '//# sourceMappingURL=' + outputPath[outputPath.rfind('/')+1:]

        # write file
        f = open(x, 'w')
        f.write(s)
        f.close()
