import { writable } from 'svelte/store';
import appleIcon from "../assets/icons/apple.svg";
import { nav } from './menu.js';


export class app {
    constructor(name, app, icon) {
        this.name = name || "App";
        this.icon = "" || appleIcon;
        this.nav = [];
        this.program = app;
        this.open = false;
        this.running = false;
    }

    setIcon(icon) {
        this.icon = icon;
    }

    setName(name) {
        this.name = name;
    }

    open() {
        this.open = true;
        this.running = true;
        nav.set(this.nav);
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
        addProcess: (process) => {
            if(!process instanceof app) throw new Error("Invalid Process");
            update(a => a.concat([process]))
        },
		reset: () => set([])
	};
}

export const processes = createProcessList();