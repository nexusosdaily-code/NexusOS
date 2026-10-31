WLS-MAP/1
MAP_HAS ["found","map","key"]
MAP_NEW ["probe"]
MAP_SET ["probe","probe","key","value"]
JTRUE ["found","replace"]
MAP_COPY ["result","map"]
RETURN ["result"]
:replace
MAP_SET ["result","map","key","value"]
RETURN ["result"]
