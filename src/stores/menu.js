import { writable } from "svelte/store";
import appleIcon from "../assets/icons/apple.svg";

export class NavItem {
  constructor(text = "Error", action = null) {
    this.text = text;
    this.icon = false;
    this.subItems = [];
    if (typeof action === "function") {
      this.action = action;
    }
  }

  static withIcon(text = "Error", icon = false, action = null) {
    const nav = new NavItem(text, action);
    nav.icon = icon;
    return nav;
  }

  addNav(newNavItem) {
    if (newNavItem instanceof NavItem) {
      if (this.action) throw new Error("Cannot add subitems to action items");
      this.subItems.push(newNavItem);
      return this; //allows you to chain add commands in a definition
    }
    throw new Error("invalid NavItem");
  }
}

const getDefaultNav = () => {
  const finder = new NavItem("Finder");
  const about = new NavItem("About", () =>
    alert("Made by Michael Van Der Velden. Inspired by MacOS")
  );
  const file = new NavItem("File");

  const close = new NavItem("Close");
  file.addNav(close);
  const find = new NavItem("Find");
  file.addNav(find);
  const folder = new NavItem("folder");
  find.addNav(folder);
  finder.addNav(about);
  find.addNav(close);

  return createFullNav(finder, file);
};

function createFullNav(...args) {
  const apple = NavItem.withIcon("OS", appleIcon);
  const about = new NavItem("About this site", () =>
    alert("Made by Michael Van Der Velden. Inspired by MacOS")
  );
  apple.addNav(about);

  return [].concat(apple, args);
}

function createNav() {
  const { subscribe, set, update } = writable(getDefaultNav());

  return {
    subscribe,
    reset: () => set(getDefaultNav()),
    set: nav => {
      console.log(nav);

      if (nav.isArray) {
        return set(createFullNav(nav));
      }

      console.error("Invalid Nav Array");
      set(createFullNav());
    }
  };
}

export const nav = createNav();
