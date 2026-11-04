{
  description = "kazuph.github.io blog development environment";

  inputs = {
    # nixpkgs-unstable no longer ships ruby_3_3; the 26.05 release branch
    # carries Ruby 3.3.13 with the October 2026 Regexp security fixes.
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-26.05";
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
