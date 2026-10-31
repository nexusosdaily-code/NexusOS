WLS-MAP/1
MAP_NEW ["result"]
CONST ["payload",""]
MAP_SIZE ["size","left"]
CONST ["index",0]
:leftscan
LT ["more","index","size"]
JTRUE ["more","leftcopy"]
MAP_SIZE ["size","right"]
CONST ["index",0]
JUMP ["rightscan"]
:leftcopy
MAP_KEY_AT ["key","left","index"]
MAP_SET ["result","result","key","payload"]
INC ["index"]
JUMP ["leftscan"]
:rightscan
LT ["more","index","size"]
JTRUE ["more","rightcopy"]
RETURN ["result"]
:rightcopy
MAP_KEY_AT ["key","right","index"]
MAP_SET ["result","result","key","payload"]
INC ["index"]
JUMP ["rightscan"]
RETURN ["result"]
