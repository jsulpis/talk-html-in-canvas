import { defineAppSetup } from "@slidev/types";
import events from "./events";
import { preventToggleFullscreen } from "./fullscreenPatch";

const empty = {};
const isProd = import.meta.env.PROD;
const lastEvent = Object.values(events).at(-1);

export const scalewayBrand = {
  logoHorizontal: import.meta.env.BASE_URL + "Scaleway-Logo.png",
};

export default defineAppSetup(({ app }) => {
  app.config.globalProperties.$event = isProd ? empty : lastEvent;
  app.config.globalProperties.$brand = isProd ? empty : scalewayBrand;

  preventToggleFullscreen();
});
