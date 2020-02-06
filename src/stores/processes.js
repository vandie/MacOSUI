import { writable } from "svelte/store";
import appleIcon from "../assets/icons/apple.svg";
import { nav, NavItem } from "./menu.js";

export class app {
  constructor(name, app, icon) {
    this.name = name || "App";
    this.icon = "" || appleIcon;
    this.nav = [new NavItem(name)];
    this.program = app;
    this.open = false;
    this.running = false;
    this.id =
      Math.random()
        .toString(36)
        .substring(2) + Date.now().toString(36);
  }

  setIcon(icon) {
    this.icon = icon;
  }

  setName(name) {
    this.name = name;
  }

  launch() {
    this.open = true;
    this.running = true;
    console.log(this.nav);
    nav.set(this.nav);
    processes.updateProcess(this);
  }

  minimise() {
    this.open = false;
  }

  close() {
    this.open = false;
    this.running = false;
    nav.reset();
  }
}

function createProcessList() {
  const { subscribe, set, update } = writable([]);

  return {
    subscribe,
    addProcess: process => {
      if (!process instanceof app) throw new Error("Invalid Process");
      update(a => a.concat([process]));
    },
    updateProcess: process =>
      update(all => all.map(p => (p.id === process.id ? process : p))),
    reset: () => set([])
  };
}

export const processes = createProcessList();
