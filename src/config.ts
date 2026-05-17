import { createMeshConfig } from "@baditaflorin/mesh-common";

export const config = createMeshConfig({
  appName: "mesh-mood-ring",
  description: "Each peer picks a hue; the room's circular-mean color paints the background.",
  accentHex: "#b878ff",
  version: __APP_VERSION__,
  commit: __GIT_COMMIT__,
});
