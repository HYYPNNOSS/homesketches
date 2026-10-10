import { generateHydrationScript, renderToString } from "solid-js/web";
import { DemoApp } from "./DemoApp";

export function render() {
  return renderToString(() => <DemoApp />);
}
export function hydrationBootstrap() {
  return generateHydrationScript();
}
