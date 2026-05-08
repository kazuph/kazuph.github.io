{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  packages = [
    pkgs.ruby_3_3
  ];

  shellHook = ''
    export BUNDLE_PATH="$PWD/vendor/bundle"
    export BUNDLE_BIN="$PWD/vendor/bundle/bin"
    export PATH="$BUNDLE_BIN:$PATH"
    echo "Ruby: $(ruby -v)"
    echo "Bundler: $(bundle -v)"
  '';
}
