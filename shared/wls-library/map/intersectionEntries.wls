WLS-MAP/1
MAP_SIZE ["size","left"]
MAP_SIZE ["rightSize","right"]
MAP_NEW ["result"]
CONST ["index",0]
:scan
LT ["more","index","size"]
JTRUE ["more","check"]
RETURN ["result"]
:check
MAP_KEY_AT ["key","left","index"]
MAP_GET ["value","left","key"]
MAP_HAS ["found","right","key"]
JTRUE ["found","compare"]
JUMP ["next"]
:compare
MAP_GET ["other","right","key"]
EQ ["matches","value","other"]
JTRUE ["matches","keep"]
JUMP ["next"]
:keep
MAP_SET ["result","result","key","value"]
:next
INC ["index"]
JUMP ["scan"]
RETURN ["result"]
