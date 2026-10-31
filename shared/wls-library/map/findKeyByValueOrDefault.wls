WLS-MAP/1
MAP_SIZE ["size","map"]
MAP_NEW ["probe"]
MAP_HAS ["valid","probe","value"]
// Fallback validation is required even when a matching key exists.
MAP_HAS ["valid","probe","fallback"]
CONST ["index",0]
:scan
LT ["more","index","size"]
JTRUE ["more","check"]
RETURN ["fallback"]
:check
MAP_KEY_AT ["key","map","index"]
MAP_GET ["item","map","key"]
EQ ["matches","item","value"]
JTRUE ["matches","found"]
INC ["index"]
JUMP ["scan"]
:found
RETURN ["key"]
