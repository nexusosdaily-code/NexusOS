WLS-MAP/1
MAP_SIZE ["size","map"]
MAP_NEW ["probe"]
MAP_HAS ["valid","probe","value"]
CONST ["index",0]
CONST ["result",-1]
:scan
LT ["more","index","size"]
JTRUE ["more","check"]
RETURN ["result"]
:check
MAP_KEY_AT ["key","map","index"]
MAP_GET ["payload","map","key"]
EQ ["matches","payload","value"]
JTRUE ["matches","found"]
JUMP ["next"]
:found
:catchUp
LT ["behind","result","index"]
JTRUE ["behind","increment"]
JUMP ["next"]
:increment
INC ["result"]
JUMP ["catchUp"]
:next
INC ["index"]
JUMP ["scan"]
RETURN ["result"]
