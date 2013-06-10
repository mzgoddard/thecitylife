#ifndef RUNNER_H_8JEXS5GD
#define RUNNER_H_8JEXS5GD

typedef struct Result {
  int success;
  struct Result *next;
  char *message;
} Result;

Result * Result_new(int, char *);
void Result_delete(Result *);
Result * Result_add(Result *, Result *);

typedef void (*TestFunc)(Result **);

typedef struct FuncWrapper {
  char * name;
  TestFunc func;
  void (*after)();
  void (*before)();
  struct FuncWrapper *next;
} FuncWrapper;

FuncWrapper * FuncWrapper_new(char *, TestFunc);
void FuncWrapper_delete(FuncWrapper *);
FuncWrapper * FuncWrapper_add(FuncWrapper *, FuncWrapper *);

typedef struct Suite {
  char *name;
  FuncWrapper *headFunc;
  void (*afterEach)();
  void (*beforeEach)();
  Result *headResult;
  struct Suite *next;
} Suite;

Suite * Suite_init(Suite *, char *name);
Suite * Suite_addFunc(Suite *, char *, TestFunc);
void Suite_run(Suite *, Result **);

void suite(char *name);
void test(char *name, TestFunc func);
void after(void (*fn)());
void before(void (*fn)());
void afterEach(void (*fn)());
void beforeEach(void (*fn)());

int ok(int test, char * message);
int eq(int x, int y, char * message);
int feq(double x, double y, char * message);

void runall();

#endif /* end of include guard: RUNNER_H_8JEXS5GD */
