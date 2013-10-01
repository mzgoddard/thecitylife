#include <stdlib.h>

#include "./list.h"

typedef struct aqlistnode {
  // both used in an active list and in a free list
  struct aqlistnode *next;
  struct aqlistnode *prev;

  AQObj *item;
} aqlistnode;

#define AQLIST_POOLSIZE 256

typedef struct aqlistnodepool {
  struct aqlistnodepool *next;
  struct aqlistnodepool *prev;

  int capacity;
  aqlistnode nodes[ AQLIST_POOLSIZE ];
  aqlistnode *head;
} aqlistnodepool;

struct AQList {
  AQObj object;

  int length;
  // int capacity;

  aqlistnode *head;
  aqlistnode *tail;

  // aqlistnodepool *headPool;
  // aqlistnodepool *tailPool;
  // aqlistnodepool *currentPool;
};

aqlistnodepool * aqlistnodepool_init( aqlistnodepool *self ) {
  self->next = NULL;
  self->prev = NULL;

  self->capacity = AQLIST_POOLSIZE;

  self->nodes[ 0 ] = (aqlistnode) {
    &( self->nodes[ 1 ]),
    NULL,
    NULL
  };

  int i;
  for ( i = 1; i < AQLIST_POOLSIZE - 1; i++ ) {
    self->nodes[ i ].next = &( self->nodes[ i + 1 ]);
    self->nodes[ i ].prev = &( self->nodes[ i - 1 ]);
    self->nodes[ i ].item = NULL;
  }

  self->nodes[ AQLIST_POOLSIZE - 1 ] = (aqlistnode) {
    NULL,
    &( self->nodes[ AQLIST_POOLSIZE - 2 ]),
    NULL
  };

  self->head = &( self->nodes[ 0 ]);

  return self;
}

aqlistnodepool * aqlistnodepool_done( aqlistnodepool *self ) {
  if ( self->next ) {
    free( aqlistnodepool_done( self->next ));

    if ( self->prev ) {
      self->prev->next = NULL;
    }
  }

  int i;
  for ( i = 0; i < AQLIST_POOLSIZE; i++ ) {
    aqrelease( self->nodes[ i ].item );
  }

  return self;
}

aqlistnode * aqlistnodepool_popLeaf( aqlistnodepool *self ) {
  aqlistnode *node = self->head;

  if ( node ) {
    self->head = node->next;
    if ( self->head ) {
      self->head->prev = NULL;
    }
    self->capacity--;
  }

  return node;
}

aqlistnode * aqlistnodepool_popSearchUp( aqlistnodepool *self ) {
  aqlistnode *node = aqlistnodepool_popLeaf( self );
  if ( !node && self->next ) {
    node = aqlistnodepool_popSearchUp( self->next );
  }
  return node;
}

aqlistnode * aqlistnodepool_popSearchDown( aqlistnodepool *self ) {
  aqlistnode *node = aqlistnodepool_popLeaf( self );
  if ( !node && self->prev ) {
    node = aqlistnodepool_popSearchDown( self->prev );
  }
  return node;
}

aqlistnode * aqlistnodepool_pop( aqlistnodepool *self ) {
  aqlistnode *node = aqlistnodepool_popSearchDown( self );
  if ( !node ) {
    node = aqlistnodepool_popSearchUp( self );
  }
  return node;
}

int _aqlistnodepool_pushLeaf( aqlistnodepool *self, aqlistnode *node ) {
  // if ( )
  return 0;
}

int _aqlistnodepool_pushSearchUp( aqlistnodepool *self, aqlistnode *node ) {
  return 0;
}

int _aqlistnodepool_pushSearchDown( aqlistnodepool *self, aqlistnode *node ) {
  return 0;
}

void aqlistnodepool_push( aqlistnodepool *self, aqlistnode *node ) {
  
}

// aqlistnodepool aqlistnodepool

aqlistnode * aqlistnode_init( aqlistnode *self ) {
  self->next = NULL;
  self->prev = NULL;
  self->item = NULL;
  return self;
}

aqlistnode * aqlistnode_done( aqlistnode *self ) {
  if ( self->next ) {
    free( aqlistnode_done( self->next ));
  }
  aqrelease( self->item );
  return self;
}

AQObj * aqlistnode_setItem( aqlistnode *self, AQObj *item ) {
  if ( self->item ) {
    aqrelease( self->item );
  }
  self->item = NULL;
  if ( item ) {
    self->item = aqretain( item );
  }
  return item;
}

struct AQList * AQList_init( struct AQList *self ) {
  self->length = 0;
  self->head = NULL;
  self->tail = NULL;
  return self;
}

struct AQList * AQList_done( struct AQList *self ) {
  if ( self->head ) {
    free( aqlistnode_done( self->head ));
  }
  return self;
}

unsigned int AQList_length( AQList *_self ) {
  struct AQList *self = (struct AQList *) _self;
  return self->length;
}

AQList * AQList_push( AQList *_self, AQObj *item ) {
  struct AQList *self = (struct AQList *) _self;

  aqlistnode *node = aqlistnode_init( malloc( sizeof( aqlistnode )));

  node->prev = self->tail;
  if ( self->tail ) {
    self->tail->next = node;
  }

  aqlistnode_setItem( node, item );

  self->length++;
  self->tail = node;
  if ( !self->head ) {
    self->head = node;
  }

  return _self;
}

AQObj * AQList_pop( AQList *_self ) {
  struct AQList *self = (struct AQList *) _self;

  aqlistnode *node = self->tail;

  AQObj *obj = NULL;

  if ( node ) {
    self->tail = node->prev;
    if ( node->prev ) {
      node->prev->next = NULL;
    }
    if ( self->head == node ) {
      self->head = NULL;
    }

    obj = aqautorelease( node->item );
    node->item = NULL;
    free( aqlistnode_done( node ));
    self->length--;
  }

  return obj;
}

AQObj * AQList_at( AQList *_self, int index ) {
  struct AQList *self = (struct AQList *) _self;

  int i;
  aqlistnode *node = self->head;
  for ( i = 0; i < self->length && i < index && node; i++ ) {
    node = node->next;
  }
  return node ? node->item : NULL;
}

AQObj * AQList_removeAt(AQList *_self, int index) {
  struct AQList *self = (struct AQList *) _self;

  if ( index == -1 ) {
    return NULL;
  }

  int i;
  aqlistnode *node = self->head;
  for ( i = 0; i < self->length && i < index && node; i++ ) {
    node = node->next;
  }

  AQObj *obj = NULL;

  if ( node ) {
    if ( self->tail == node ) {
      self->tail = node->prev;
    }
    if ( self->head == node ) {
      self->head = node->next;
    }

    if ( node->prev ) {
      node->prev->next = node->next;
      node->prev = NULL;
    }
    if ( node->next ) {
      node->next->prev = node->prev;
      node->next = NULL;
    }

    obj = aqautorelease( node->item );
    node->item = NULL;
    free( aqlistnode_done( node ));
    self->length--;
  }

  return obj;
}

int AQList_indexOf( AQList *_self, AQObj *item ) {
  struct AQList *self = (struct AQList *) _self;

  int i;
  aqlistnode *node = self->head;
  for ( i = 0; node && node->item != item; i++ ) {
    node = node->next;
  }

  return node ? i : -1;
}

AQObj * AQList_remove( AQList *self, AQObj *item ) {
  return AQList_removeAt( self, AQList_indexOf( self, item ));
}

AQList * AQList_iterate( AQList *_self, AQList_iterator iterator, void *ctx ) {
  struct AQList *self = (struct AQList *) _self;

  aqlistnode *node = self->head;
  while( node ) {
    iterator( node->item, ctx );
    node = node->next;
  }
  return _self;
}

AQObj * AQList_find( AQList *_self, AQList_findIterator iterator, void *ctx ) {
  struct AQList *self = (struct AQList *) _self;

  aqlistnode *node = self->head;
  while( node ) {
    if ( iterator( node->item, ctx ) ) {
      return node->item;
    }
    node = node->next;
  }
  return NULL;
}

int AQList_findIndex( AQList *_self, AQList_findIterator iterator, void *ctx ) {
  struct AQList *self = (struct AQList *) _self;

  aqlistnode *node = self->head;
  int index = 0;
  while( node ) {
    if ( iterator( node->item, ctx ) ) {
      return index;
    }
    node = node->next;
    index++;
  }
  return -1;
}

AQTYPE_ALL(
  AQList, sizeof(struct AQList), NULL,
  AQList_init, AQList_done, AQObj_getInterface
);
