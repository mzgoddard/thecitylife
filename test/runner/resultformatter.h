#ifndef RESULTFORMATTER_H_KQMJ8B8S
#define RESULTFORMATTER_H_KQMJ8B8S

typedef void (*PrintSuiteTitle)(void *, void *);
typedef void (*PrintFuncWrapper)(void *, void *);
typedef void (*PrintResult)(void *, void *);
typedef void (*PrintReport)(void *);

typedef struct ResultFormatter {
  PrintSuiteTitle printSuiteTitle;
  PrintFuncWrapper printFuncWrapper;
  PrintResult printResult;
  PrintReport printReport;
} ResultFormatter;

ResultFormatter *DotFormatter_new( int ansiColor );
ResultFormatter *HtmlDotFormatter_new();
ResultFormatter *MessageFormatter_new();

#endif /* end of include guard: RESULTFORMATTER_H_KQMJ8B8S */
