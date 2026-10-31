WLS-MAP/1
MAP_NEW ["result"]
MAP_SIZE ["size","left"]
CONST ["index",0]
:scan
LT ["more","index","size"]
JTRUE ["more","check"]
RETURN ["result"]
:check
MAP_KEY_AT ["key","left","index"]
MAP_HAS ["found","right","key"]
JTRUE ["found","keep"]
:next
INC ["index"]
JUMP ["scan"]
:keep
MAP_GET ["value","left","key"]
MAP_SET ["result","result","key","value"]
JUMP ["next"]
RETURN ["result"]
