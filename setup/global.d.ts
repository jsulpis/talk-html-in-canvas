import type events from "./events";
import { scalewayBrand } from "./main";

type Event = (typeof events)[keyof typeof events];
type Brand = typeof scalewayBrand;

declare module "vue" {
  interface ComponentCustomProperties {
    /** Current conference, empty in production builds. */
    $event: Event;
    /** Branding, empty in production builds. */
    $brand: Brand;
  }
}
