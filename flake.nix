{
  description = "kazuph.github.io blog development environment";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      supportedSystems = [
        "aarch64-darwin"
        "x86_64-darwin"
        "aarch64-linux"
        "x86_64-linux"
      ];

      forAllSystems = nixpkgs.lib.genAttrs supportedSystems;
    in
    {
      devShells = forAllSystems (system:
        let
          pkgs = import nixpkgs { inherit system; };
        in
        {
          default = pkgs.mkShell {
            packages = [
              pkgs.imagemagick
              pkgs.noto-fonts-cjk-sans
              pkgs.ruby_3_3
            ];

            shellHook = ''
              export BUNDLE_PATH="$PWD/vendor/bundle"
              export BUNDLE_BIN="$PWD/vendor/bundle/bin"
              export PATH="$BUNDLE_BIN:$PATH"
              echo "Ruby: $(ruby -v)"
              echo "Bundler: $(bundle -v)"
            '';
          };
        });
    };
}
