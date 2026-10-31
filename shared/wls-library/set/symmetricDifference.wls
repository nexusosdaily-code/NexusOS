WLS-MAP/1
MAP_SIZE ["leftSize","left"]
MAP_SIZE ["rightSize","right"]
MAP_NEW ["result"]
CONST ["payload",""]
CONST ["index",0]
:leftscan
LT ["more","index","leftSize"]
JTRUE ["more","leftcheck"]
CONST ["index",0]
JUMP ["rightscan"]
:leftcheck
MAP_KEY_AT ["key","left","index"]
MAP_HAS ["found","right","key"]
JTRUE ["found","leftnext"]
MAP_SET ["result","result","key","payload"]
:leftnext
INC ["index"]
JUMP ["leftscan"]
:rightscan
LT ["more","index","rightSize"]
JTRUE ["more","rightcheck"]
RETURN ["result"]
:rightcheck
MAP_KEY_AT ["key","right","index"]
MAP_HAS ["found","left","key"]
JTRUE ["found","rightnext"]
MAP_SET ["result","result","key","payload"]
:rightnext
INC ["index"]
JUMP ["rightscan"]
RETURN ["result"]
