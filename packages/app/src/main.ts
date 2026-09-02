import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";
import initSqlJs from "sql.js";
import sqlWasmUrl from "sql.js/dist/sql-wasm.wasm?url";
import {
  BrowserSQLAdapter,
  CoreAPI,
  EventBus,
  ModuleRegistry,
  CORE_API_KEY,
  EVENT_BUS_KEY,
  MODULE_REGISTRY_KEY,
} from "@naoj/core";
import { NotesModule } from "@naoj/notes";

async function bootstrap() {
  // Database
  const adapter = new BrowserSQLAdapter(initSqlJs, sqlWasmUrl);
  await adapter.open(":memory:");

  const core = new CoreAPI(adapter);
  await core.initialize();

  // Event bus
  const events = new EventBus();

  // Module registry — register all modules before mounting
  const registry = new ModuleRegistry(core, events);
  await registry.register(new NotesModule());

  // Add module routes then a home fallback
  registry.getRoutes().forEach((route) => router.addRoute(route));
  router.addRoute({
    path: "/",
    name: "home",
    component: () => import("./components/WelcomeView.vue"),
  });

  // Vue app
  const app = createApp(App);
  app.provide(CORE_API_KEY, core);
  app.provide(EVENT_BUS_KEY, events);
  app.provide(MODULE_REGISTRY_KEY, registry);
  app.use(router);
  app.mount("#app");
}

bootstrap().catch(console.error);
