#ifndef LIST_H_DXZWNGGA
#define LIST_H_DXZWNGGA

#include "./obj.h"

extern AQType AQListType;

typedef AQObj AQList;

typedef void (*AQList_iterator)( AQObj *, void * );

unsigned int AQList_length(AQList *);

AQList * AQList_push(AQList *, AQObj *);
AQObj * AQList_pop(AQList *);

AQObj * AQList_at(AQList *, int);
AQObj * AQList_removeAt(AQList *, int);
int AQList_indexOf(AQList *, AQObj *);
AQObj * AQList_remove(AQList *, AQObj *);

AQList * AQList_iterate( AQList *, AQList_iterator, void * );

void aqlist_init();

#endif /* end of include guard: LIST_H_DXZWNGGA */
