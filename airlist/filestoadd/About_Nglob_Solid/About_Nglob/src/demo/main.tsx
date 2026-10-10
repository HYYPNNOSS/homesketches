import { hydrate, render } from "solid-js/web";
import { DemoApp } from "./DemoApp";

const root = document.getElementById("root")!;
const mount = () => <DemoApp />;
const dispose = root.hasChildNodes() ? hydrate(mount, root) : render(mount, root);
if (import.meta.hot) import.meta.hot.dispose(dispose);
