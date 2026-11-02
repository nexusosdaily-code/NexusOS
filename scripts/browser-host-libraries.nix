# Test-only libraries from the workspace's pinned Nix channel. These are passed
# to downloaded browser children, never to PostgreSQL or application processes.
with import <nixpkgs> {};
{
  libraryPath = lib.makeLibraryPath [
    gtk3 glib pango cairo gdk-pixbuf atk at-spi2-atk stdenv.cc.cc.lib
    xorg.libX11 xorg.libXext xorg.libXi xorg.libXrandr xorg.libXcursor
    xorg.libXcomposite xorg.libXdamage xorg.libXfixes xorg.libXrender xorg.libxcb
    alsa-lib fontconfig dbus
    gst_all_1.gstreamer gst_all_1.gst-plugins-base gst_all_1.gst-plugins-bad
    gst_all_1.gst-libav libxml2 libxslt sqlite lcms2 libevent libopus
    libgcrypt libgpg-error flite libwebp libavif harfbuzz harfbuzzFull
    libepoxy libglvnd libdrm libgbm libsoup_3 enchant2 hyphen libmanette
    libsecret libtasn1 nghttp2 libpsl libxkbcommon wayland systemd
    gtk4 vulkan-loader graphene expat libGL x264 icu74 libjpeg8
  ];
  eglVendor = "${mesa}/share/glvnd/egl_vendor.d/50_mesa.json";
  drivers = "${mesa}/lib/dri";
}
