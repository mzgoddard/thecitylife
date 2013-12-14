#!/usr/bin/env python

import re
import optparse
import base64

parser = optparse.OptionParser()
parser.add_option("-f", "--file")
(options, args) = parser.parse_args()

if options.file == None:
    print("No file(s) listed to fix.\n\n")
    parser.print_help()
    sys.exit(1)

for x in (options.file and isinstance(options.file, list) or [options.file]):
    # read file
    print("Fixing {0}\n".format(x))
    f = open(x)
    s = f.read()
    f.close()

    match = re.search(r'//[#@] sourceMappingURL=data:application/json;base64,(.*)\n?', s)
    if match:
        datauri = match.group(1)
        datauri = base64.b64decode(datauri)
        outputPath = options.file + '.map'
        f = open(outputPath, 'w')
        f.write(datauri)
        f.close()

        options.file[options.file.rfind('/') + 1:] + '.map'
        s = s[:match.start()] + '//# sourceMappingURL=' + outputPath[outputPath.rfind('/')+1:]

        # write file
        f = open(x, 'w')
        f.write(s)
        f.close()
