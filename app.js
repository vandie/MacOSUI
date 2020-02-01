(function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function subscribe(store, callback) {
        const unsub = store.subscribe(callback);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if (typeof $$scope.dirty === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_data(text, data) {
        data = '' + data;
        if (text.data !== data)
            text.data = data;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if ($$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    /* src/components/NavBarItem.svelte generated by Svelte v3.17.1 */

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[9] = list[i];
    	return child_ctx;
    }

    // (100:8) {:else}
    function create_else_block(ctx) {
    	let button;
    	let raw_value = (/*icon*/ ctx[4] || /*text*/ ctx[1]) + "";
    	let dispose;

    	return {
    		c() {
    			button = element("button");
    			attr(button, "class", "nav-bar__item__button svelte-1cw2a7b");
    		},
    		m(target, anchor) {
    			insert(target, button, anchor);
    			button.innerHTML = raw_value;
    			dispose = listen(button, "click", /*action*/ ctx[3]);
    		},
    		p(ctx, dirty) {
    			if (dirty & /*icon, text*/ 18 && raw_value !== (raw_value = (/*icon*/ ctx[4] || /*text*/ ctx[1]) + "")) button.innerHTML = raw_value;		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(button);
    			dispose();
    		}
    	};
    }

    // (91:8) {#if subItems.length}
    function create_if_block(ctx) {
    	let button;
    	let raw_value = (/*icon*/ ctx[4] || /*text*/ ctx[1]) + "";
    	let t;
    	let if_block_anchor;
    	let current;
    	let if_block = /*active*/ ctx[0] && create_if_block_1(ctx);

    	return {
    		c() {
    			button = element("button");
    			t = space();
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    			attr(button, "class", "nav-bar__item__button nav-bar__item__button--has-children svelte-1cw2a7b");
    		},
    		m(target, anchor) {
    			insert(target, button, anchor);
    			button.innerHTML = raw_value;
    			insert(target, t, anchor);
    			if (if_block) if_block.m(target, anchor);
    			insert(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			if ((!current || dirty & /*icon, text*/ 18) && raw_value !== (raw_value = (/*icon*/ ctx[4] || /*text*/ ctx[1]) + "")) button.innerHTML = raw_value;
    			if (/*active*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    					transition_in(if_block, 1);
    				} else {
    					if_block = create_if_block_1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(button);
    			if (detaching) detach(t);
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach(if_block_anchor);
    		}
    	};
    }

    // (93:12) {#if active}
    function create_if_block_1(ctx) {
    	let ul;
    	let current;
    	let each_value = /*subItems*/ ctx[2];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(ul, "class", "nav-bar__item__sub-nav");
    		},
    		m(target, anchor) {
    			insert(target, ul, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			current = true;
    		},
    		p(ctx, dirty) {
    			if (dirty & /*subItems*/ 4) {
    				each_value = /*subItems*/ ctx[2];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(ul, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(ul);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    // (95:16) {#each subItems as subItem}
    function create_each_block(ctx) {
    	let current;
    	const navbaritem_spread_levels = [/*subItem*/ ctx[9]];
    	let navbaritem_props = {};

    	for (let i = 0; i < navbaritem_spread_levels.length; i += 1) {
    		navbaritem_props = assign(navbaritem_props, navbaritem_spread_levels[i]);
    	}

    	const navbaritem = new NavBarItem({ props: navbaritem_props });

    	return {
    		c() {
    			create_component(navbaritem.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(navbaritem, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const navbaritem_changes = (dirty & /*subItems*/ 4)
    			? get_spread_update(navbaritem_spread_levels, [get_spread_object(/*subItem*/ ctx[9])])
    			: {};

    			navbaritem.$set(navbaritem_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(navbaritem.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(navbaritem.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(navbaritem, detaching);
    		}
    	};
    }

    function create_fragment(ctx) {
    	let li;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	let dispose;
    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*subItems*/ ctx[2].length) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	return {
    		c() {
    			li = element("li");
    			if_block.c();
    			attr(li, "class", "nav-bar__item svelte-1cw2a7b");
    		},
    		m(target, anchor) {
    			insert(target, li, anchor);
    			if_blocks[current_block_type_index].m(li, null);
    			/*li_binding*/ ctx[8](li);
    			current = true;
    			dispose = listen(li, "mouseup", /*activate*/ ctx[6]);
    		},
    		p(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(li, null);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(li);
    			if_blocks[current_block_type_index].d();
    			/*li_binding*/ ctx[8](null);
    			dispose();
    		}
    	};
    }

    function instance($$self, $$props, $$invalidate) {
    	let { text = "Error" } = $$props;
    	let { subItems = [] } = $$props;

    	let { action = () => {
    		
    	} } = $$props;

    	let { active = false } = $$props;
    	let { icon } = $$props;
    	let domItem;

    	const isDescendant = (parent, child) => {
    		var node = child.parentNode;

    		while (node != null) {
    			if (node == parent) {
    				return true;
    			}

    			node = node.parentNode;
    		}

    		return false;
    	};

    	const activate = event => {
    		$$invalidate(0, active = true);
    	};

    	document.addEventListener("mousedown", event => {
    		if (isDescendant(domItem, event.target) || event.target === domItem) return;
    		$$invalidate(0, active = false);
    	});

    	function li_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate(5, domItem = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("text" in $$props) $$invalidate(1, text = $$props.text);
    		if ("subItems" in $$props) $$invalidate(2, subItems = $$props.subItems);
    		if ("action" in $$props) $$invalidate(3, action = $$props.action);
    		if ("active" in $$props) $$invalidate(0, active = $$props.active);
    		if ("icon" in $$props) $$invalidate(4, icon = $$props.icon);
    	};

    	return [
    		active,
    		text,
    		subItems,
    		action,
    		icon,
    		domItem,
    		activate,
    		isDescendant,
    		li_binding
    	];
    }

    class NavBarItem extends SvelteComponent {
    	constructor(options) {
    		super();

    		init(this, options, instance, create_fragment, safe_not_equal, {
    			text: 1,
    			subItems: 2,
    			action: 3,
    			active: 0,
    			icon: 4
    		});
    	}
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    var appleIcon = `<?xml version="1.0" encoding="iso-8859-1"?>
<!-- Generator: Adobe Illustrator 21.0.0, SVG Export Plug-In . SVG Version: 6.00 Build 0)  -->
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" id="Capa_1" x="0px" y="0px" viewBox="0 0 512 512" style="enable-background:new 0 0 512 512;" xml:space="preserve">
<g>
	<path d="M185.255,512c-76.201-0.439-139.233-155.991-139.233-235.21c0-129.404,97.075-157.734,134.487-157.734   c16.86,0,34.863,6.621,50.742,12.48c11.104,4.087,22.588,8.306,28.975,8.306c3.823,0,12.832-3.589,20.786-6.738   c16.963-6.753,38.071-15.146,62.651-15.146c0.044,0,0.103,0,0.146,0c18.354,0,74.004,4.028,107.461,54.272l7.837,11.777   l-11.279,8.511c-16.113,12.158-45.513,34.336-45.513,78.267c0,52.031,33.296,72.041,49.292,81.665   c7.061,4.248,14.37,8.628,14.37,18.208c0,6.255-49.922,140.566-122.417,140.566c-17.739,0-30.278-5.332-41.338-10.034   c-11.191-4.761-20.845-8.862-36.797-8.862c-8.086,0-18.311,3.823-29.136,7.881C221.496,505.73,204.752,512,185.753,512H185.255z"/>
	<path d="M351.343,0c1.888,68.076-46.797,115.304-95.425,112.342C247.905,58.015,304.54,0,351.343,0z"/>
</g>















</svg>`;

    class NavItem {
        constructor(text = "Error",action = null) {
            this.text = text;
            this.icon = false;
            this.subItems = [];
            if(typeof action === "function"){
                this.action = action;
            }
        }

        static withIcon(text = "Error", icon = false, action = null) {
            const nav = new NavItem(text, action);
            nav.icon = icon;
            return nav;
        }

        addNav(newNavItem) {
            if(newNavItem instanceof NavItem){
                if(this.action) throw new Error("Cannot add subitems to action items");
                this.subItems.push(newNavItem);
                return this; //allows you to chain add commands in a definition
            }
            throw new Error("invalid NavItem");
        }
    }

    const getDefaultNav = () => {
        const finder = new NavItem("Finder");
        const about = new NavItem(
            "About",
            () => alert("Made by Michael Van Der Velden. Inspired by MacOS")
        );
        const file = new NavItem(
            "File"
        );

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
        const apple = NavItem.withIcon("OS",appleIcon);
        const about = new NavItem(
            "About this site",
            () => alert("Made by Michael Van Der Velden. Inspired by MacOS")
        );
        apple.addNav(about);

        return [].concat(
            apple,
            args
        )
    }

    function createNav() {
    	const { subscribe, set, update } = writable(getDefaultNav());

    	return {
    		subscribe,
    		reset: () => set(getDefaultNav())
    	};
    }

    const nav = createNav();

    /* src/components/NavBar.svelte generated by Svelte v3.17.1 */

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[1] = list[i];
    	return child_ctx;
    }

    // (31:8) {#each $nav as item}
    function create_each_block$1(ctx) {
    	let current;
    	const navbaritem_spread_levels = [/*item*/ ctx[1]];
    	let navbaritem_props = {};

    	for (let i = 0; i < navbaritem_spread_levels.length; i += 1) {
    		navbaritem_props = assign(navbaritem_props, navbaritem_spread_levels[i]);
    	}

    	const navbaritem = new NavBarItem({ props: navbaritem_props });

    	return {
    		c() {
    			create_component(navbaritem.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(navbaritem, target, anchor);
    			current = true;
    		},
    		p(ctx, dirty) {
    			const navbaritem_changes = (dirty & /*$nav*/ 1)
    			? get_spread_update(navbaritem_spread_levels, [get_spread_object(/*item*/ ctx[1])])
    			: {};

    			navbaritem.$set(navbaritem_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(navbaritem.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(navbaritem.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(navbaritem, detaching);
    		}
    	};
    }

    function create_fragment$1(ctx) {
    	let div;
    	let ul;
    	let current;
    	let each_value = /*$nav*/ ctx[0];
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	return {
    		c() {
    			div = element("div");
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr(ul, "class", "nav-bar__nav");
    			attr(div, "class", "nav-bar");
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			current = true;
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*$nav*/ 1) {
    				each_value = /*$nav*/ ctx[0];
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(ul, null);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			destroy_each(each_blocks, detaching);
    		}
    	};
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $nav;
    	component_subscribe($$self, nav, $$value => $$invalidate(0, $nav = $$value));
    	return [$nav];
    }

    class NavBar extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});
    	}
    }

    /* src/components/WindowControl.svelte generated by Svelte v3.17.1 */

    function create_fragment$2(ctx) {
    	let button;
    	let t;
    	let dispose;

    	return {
    		c() {
    			button = element("button");
    			t = text(/*text*/ ctx[0]);
    			attr(button, "class", "window-control svelte-cuhxq2");
    			attr(button, "type", /*type*/ ctx[1]);
    		},
    		m(target, anchor) {
    			insert(target, button, anchor);
    			append(button, t);
    			dispose = listen(button, "click", /*action*/ ctx[2]);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*text*/ 1) set_data(t, /*text*/ ctx[0]);

    			if (dirty & /*type*/ 2) {
    				attr(button, "type", /*type*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(button);
    			dispose();
    		}
    	};
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { text = "Close" } = $$props;
    	let { type = "close" } = $$props;

    	let { action = () => {
    		
    	} } = $$props;

    	$$self.$set = $$props => {
    		if ("text" in $$props) $$invalidate(0, text = $$props.text);
    		if ("type" in $$props) $$invalidate(1, type = $$props.type);
    		if ("action" in $$props) $$invalidate(2, action = $$props.action);
    	};

    	return [text, type, action];
    }

    class WindowControl extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { text: 0, type: 1, action: 2 });
    	}
    }

    /* src/components/Window.svelte generated by Svelte v3.17.1 */

    function create_if_block_2(ctx) {
    	let current;
    	const windowcontrol = new WindowControl({ props: { type: "close", text: "Close" } });

    	return {
    		c() {
    			create_component(windowcontrol.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(windowcontrol, target, anchor);
    			current = true;
    		},
    		i(local) {
    			if (current) return;
    			transition_in(windowcontrol.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(windowcontrol.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(windowcontrol, detaching);
    		}
    	};
    }

    // (119:8) {#if allow.min}
    function create_if_block_1$1(ctx) {
    	let current;
    	const windowcontrol = new WindowControl({ props: { type: "min", text: "Minify" } });

    	return {
    		c() {
    			create_component(windowcontrol.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(windowcontrol, target, anchor);
    			current = true;
    		},
    		i(local) {
    			if (current) return;
    			transition_in(windowcontrol.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(windowcontrol.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(windowcontrol, detaching);
    		}
    	};
    }

    // (120:8) {#if allow.max}
    function create_if_block$1(ctx) {
    	let current;

    	const windowcontrol = new WindowControl({
    			props: {
    				action: /*maximise*/ ctx[4],
    				type: "max",
    				text: "Maxify"
    			}
    		});

    	return {
    		c() {
    			create_component(windowcontrol.$$.fragment);
    		},
    		m(target, anchor) {
    			mount_component(windowcontrol, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(windowcontrol.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(windowcontrol.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			destroy_component(windowcontrol, detaching);
    		}
    	};
    }

    function create_fragment$3(ctx) {
    	let div;
    	let section0;
    	let t0;
    	let t1;
    	let t2;
    	let section1;
    	let section1_class_value;
    	let div_moving_value;
    	let div_size_value;
    	let current;
    	let dispose;
    	let if_block0 = /*allow*/ ctx[1].close && create_if_block_2();
    	let if_block1 = /*allow*/ ctx[1].min && create_if_block_1$1();
    	let if_block2 = /*allow*/ ctx[1].max && create_if_block$1(ctx);
    	const default_slot_template = /*$$slots*/ ctx[10].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[9], null);

    	return {
    		c() {
    			div = element("div");
    			section0 = element("section");
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			if (if_block2) if_block2.c();
    			t2 = space();
    			section1 = element("section");
    			if (default_slot) default_slot.c();
    			attr(section0, "class", "window__nav svelte-b3sroh");
    			attr(section1, "class", section1_class_value = "window__body " + (/*noPadding*/ ctx[2] ? "window__body--no-padding" : "") + " svelte-b3sroh");
    			attr(div, "class", "window svelte-b3sroh");
    			set_style(div, "left", /*pos*/ ctx[0].x + "px");
    			set_style(div, "top", /*pos*/ ctx[0].y + "px");
    			attr(div, "moving", div_moving_value = /*pos*/ ctx[0].autoMoving);
    			attr(div, "size", div_size_value = /*pos*/ ctx[0].size);
    		},
    		m(target, anchor) {
    			insert(target, div, anchor);
    			append(div, section0);
    			if (if_block0) if_block0.m(section0, null);
    			append(section0, t0);
    			if (if_block1) if_block1.m(section0, null);
    			append(section0, t1);
    			if (if_block2) if_block2.m(section0, null);
    			append(div, t2);
    			append(div, section1);

    			if (default_slot) {
    				default_slot.m(section1, null);
    			}

    			current = true;

    			dispose = [
    				listen(section0, "mousedown", /*startMoving*/ ctx[3]),
    				listen(section0, "dblclick", function () {
    					if (is_function(/*allow*/ ctx[1].max && /*maximise*/ ctx[4])) (/*allow*/ ctx[1].max && /*maximise*/ ctx[4]).apply(this, arguments);
    				})
    			];
    		},
    		p(new_ctx, [dirty]) {
    			ctx = new_ctx;

    			if (/*allow*/ ctx[1].close) {
    				if (!if_block0) {
    					if_block0 = create_if_block_2();
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(section0, t0);
    				} else {
    					transition_in(if_block0, 1);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (/*allow*/ ctx[1].min) {
    				if (!if_block1) {
    					if_block1 = create_if_block_1$1();
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(section0, t1);
    				} else {
    					transition_in(if_block1, 1);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (/*allow*/ ctx[1].max) {
    				if (if_block2) {
    					if_block2.p(ctx, dirty);
    					transition_in(if_block2, 1);
    				} else {
    					if_block2 = create_if_block$1(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(section0, null);
    				}
    			} else if (if_block2) {
    				group_outros();

    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});

    				check_outros();
    			}

    			if (default_slot && default_slot.p && dirty & /*$$scope*/ 512) {
    				default_slot.p(get_slot_context(default_slot_template, ctx, /*$$scope*/ ctx[9], null), get_slot_changes(default_slot_template, /*$$scope*/ ctx[9], dirty, null));
    			}

    			if (!current || dirty & /*noPadding*/ 4 && section1_class_value !== (section1_class_value = "window__body " + (/*noPadding*/ ctx[2] ? "window__body--no-padding" : "") + " svelte-b3sroh")) {
    				attr(section1, "class", section1_class_value);
    			}

    			if (!current || dirty & /*pos*/ 1) {
    				set_style(div, "left", /*pos*/ ctx[0].x + "px");
    			}

    			if (!current || dirty & /*pos*/ 1) {
    				set_style(div, "top", /*pos*/ ctx[0].y + "px");
    			}

    			if (!current || dirty & /*pos*/ 1 && div_moving_value !== (div_moving_value = /*pos*/ ctx[0].autoMoving)) {
    				attr(div, "moving", div_moving_value);
    			}

    			if (!current || dirty & /*pos*/ 1 && div_size_value !== (div_size_value = /*pos*/ ctx[0].size)) {
    				attr(div, "size", div_size_value);
    			}
    		},
    		i(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			transition_in(if_block2);
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			transition_out(if_block2);
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(div);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if (if_block2) if_block2.d();
    			if (default_slot) default_slot.d(detaching);
    			run_all(dispose);
    		}
    	};
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let mouseDown = false;

    	let { allow = {
    		min: true,
    		max: true,
    		close: true,
    		move: true
    	} } = $$props;

    	let { noPadding = false } = $$props;

    	let { pos = {
    		x: Math.floor(Math.random() * 50) + 10,
    		y: Math.floor(Math.random() * 50) + 22,
    		localX: 0,
    		localY: 0,
    		isMoving: false,
    		autoMoving: false,
    		size: "small",
    		oldSize: "small"
    	} } = $$props;

    	let limits = { minY: 22 };

    	const startMoving = event => {
    		mouseDown = true;

    		setTimeout(
    			() => {
    				if (!mouseDown) return;
    				$$invalidate(0, pos.isMoving = allow.move, pos);
    				$$invalidate(0, pos.localX = event.clientX - event.target.getBoundingClientRect().left, pos);
    				$$invalidate(0, pos.localY = event.clientY - event.target.getBoundingClientRect().top, pos);
    			},
    			200
    		);
    	};

    	const stopMoving = event => {
    		mouseDown = false;
    		$$invalidate(0, pos.isMoving = false, pos);
    	};

    	const moving = event => {
    		if (pos.isMoving) {
    			$$invalidate(0, pos.x = event.clientX - pos.localX, pos);
    			$$invalidate(0, pos.y = event.clientY - pos.localY, pos);
    			if (pos.y < limits.minY) $$invalidate(0, pos.y = limits.minY, pos);
    		}
    	};

    	const maximise = event => {
    		if (pos.size === "max") {
    			$$invalidate(0, pos.size = pos.oldSize, pos);
    			return;
    		}

    		$$invalidate(0, pos.autoMoving = true, pos);
    		$$invalidate(0, pos.oldSize = pos.size, pos);
    		$$invalidate(0, pos.size = "max", pos);
    		$$invalidate(0, pos.x = 0, pos);
    		$$invalidate(0, pos.y = limits.minY, pos);
    		setTimeout(() => $$invalidate(0, pos.autoMoving = false, pos), 200);
    	};

    	document.addEventListener("mouseup", stopMoving);
    	document.addEventListener("mousemove", moving);
    	let { $$slots = {}, $$scope } = $$props;

    	$$self.$set = $$props => {
    		if ("allow" in $$props) $$invalidate(1, allow = $$props.allow);
    		if ("noPadding" in $$props) $$invalidate(2, noPadding = $$props.noPadding);
    		if ("pos" in $$props) $$invalidate(0, pos = $$props.pos);
    		if ("$$scope" in $$props) $$invalidate(9, $$scope = $$props.$$scope);
    	};

    	return [
    		pos,
    		allow,
    		noPadding,
    		startMoving,
    		maximise,
    		mouseDown,
    		limits,
    		stopMoving,
    		moving,
    		$$scope,
    		$$slots
    	];
    }

    class Window extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, { allow: 1, noPadding: 2, pos: 0 });
    	}
    }

    /* src/components/AppIcon.svelte generated by Svelte v3.17.1 */

    function create_fragment$4(ctx) {
    	let button;
    	let dispose;

    	return {
    		c() {
    			button = element("button");
    			attr(button, "class", "app-icon svelte-1goefi5");
    			attr(button, "active", /*active*/ ctx[2]);
    			attr(button, "name", /*name*/ ctx[1]);
    		},
    		m(target, anchor) {
    			insert(target, button, anchor);
    			button.innerHTML = /*icon*/ ctx[0];
    			dispose = listen(button, "click", /*action*/ ctx[3]);
    		},
    		p(ctx, [dirty]) {
    			if (dirty & /*icon*/ 1) button.innerHTML = /*icon*/ ctx[0];
    			if (dirty & /*active*/ 4) {
    				attr(button, "active", /*active*/ ctx[2]);
    			}

    			if (dirty & /*name*/ 2) {
    				attr(button, "name", /*name*/ ctx[1]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d(detaching) {
    			if (detaching) detach(button);
    			dispose();
    		}
    	};
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { icon = appleIcon } = $$props;
    	let { name = "App" } = $$props;
    	let { active = false } = $$props;

    	let { action = () => {
    		
    	} } = $$props;

    	$$self.$set = $$props => {
    		if ("icon" in $$props) $$invalidate(0, icon = $$props.icon);
    		if ("name" in $$props) $$invalidate(1, name = $$props.name);
    		if ("active" in $$props) $$invalidate(2, active = $$props.active);
    		if ("action" in $$props) $$invalidate(3, action = $$props.action);
    	};

    	return [icon, name, active, action];
    }

    class AppIcon extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, { icon: 0, name: 1, active: 2, action: 3 });
    	}
    }

    /* src/components/Dock.svelte generated by Svelte v3.17.1 */

    function create_fragment$5(ctx) {
    	let section;
    	let t0;
    	let t1;
    	let t2;
    	let current;
    	const appicon0 = new AppIcon({ props: { active: true } });
    	const appicon1 = new AppIcon({});
    	const appicon2 = new AppIcon({});
    	const appicon3 = new AppIcon({});

    	return {
    		c() {
    			section = element("section");
    			create_component(appicon0.$$.fragment);
    			t0 = space();
    			create_component(appicon1.$$.fragment);
    			t1 = space();
    			create_component(appicon2.$$.fragment);
    			t2 = space();
    			create_component(appicon3.$$.fragment);
    			attr(section, "class", "dock svelte-1jatk8m");
    		},
    		m(target, anchor) {
    			insert(target, section, anchor);
    			mount_component(appicon0, section, null);
    			append(section, t0);
    			mount_component(appicon1, section, null);
    			append(section, t1);
    			mount_component(appicon2, section, null);
    			append(section, t2);
    			mount_component(appicon3, section, null);
    			current = true;
    		},
    		p: noop,
    		i(local) {
    			if (current) return;
    			transition_in(appicon0.$$.fragment, local);
    			transition_in(appicon1.$$.fragment, local);
    			transition_in(appicon2.$$.fragment, local);
    			transition_in(appicon3.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(appicon0.$$.fragment, local);
    			transition_out(appicon1.$$.fragment, local);
    			transition_out(appicon2.$$.fragment, local);
    			transition_out(appicon3.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(section);
    			destroy_component(appicon0);
    			destroy_component(appicon1);
    			destroy_component(appicon2);
    			destroy_component(appicon3);
    		}
    	};
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { side = "right" } = $$props;

    	$$self.$set = $$props => {
    		if ("side" in $$props) $$invalidate(0, side = $$props.side);
    	};

    	return [side];
    }

    class Dock extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, { side: 0 });
    	}
    }

    /* src/App.svelte generated by Svelte v3.17.1 */

    function create_default_slot(ctx) {
    	let img;
    	let img_src_value;

    	return {
    		c() {
    			img = element("img");
    			attr(img, "alt", "test");
    			if (img.src !== (img_src_value = "https://www.dumpaday.com/wp-content/uploads/2018/09/photos-21-3.jpg")) attr(img, "src", img_src_value);
    			attr(img, "width", "100%");
    			attr(img, "height", "480px");
    		},
    		m(target, anchor) {
    			insert(target, img, anchor);
    		},
    		d(detaching) {
    			if (detaching) detach(img);
    		}
    	};
    }

    function create_fragment$6(ctx) {
    	let header;
    	let t0;
    	let main;
    	let t1;
    	let current;
    	const navbar = new NavBar({});

    	const window = new Window({
    			props: {
    				noPadding: true,
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			}
    		});

    	const dock = new Dock({});

    	return {
    		c() {
    			header = element("header");
    			create_component(navbar.$$.fragment);
    			t0 = space();
    			main = element("main");
    			create_component(window.$$.fragment);
    			t1 = space();
    			create_component(dock.$$.fragment);
    			attr(main, "class", "main");
    		},
    		m(target, anchor) {
    			insert(target, header, anchor);
    			mount_component(navbar, header, null);
    			insert(target, t0, anchor);
    			insert(target, main, anchor);
    			mount_component(window, main, null);
    			append(main, t1);
    			mount_component(dock, main, null);
    			current = true;
    		},
    		p(ctx, [dirty]) {
    			const window_changes = {};

    			if (dirty & /*$$scope*/ 1) {
    				window_changes.$$scope = { dirty, ctx };
    			}

    			window.$set(window_changes);
    		},
    		i(local) {
    			if (current) return;
    			transition_in(navbar.$$.fragment, local);
    			transition_in(window.$$.fragment, local);
    			transition_in(dock.$$.fragment, local);
    			current = true;
    		},
    		o(local) {
    			transition_out(navbar.$$.fragment, local);
    			transition_out(window.$$.fragment, local);
    			transition_out(dock.$$.fragment, local);
    			current = false;
    		},
    		d(detaching) {
    			if (detaching) detach(header);
    			destroy_component(navbar);
    			if (detaching) detach(t0);
    			if (detaching) detach(main);
    			destroy_component(window);
    			destroy_component(dock);
    		}
    	};
    }

    class App extends SvelteComponent {
    	constructor(options) {
    		super();
    		init(this, options, null, create_fragment$6, safe_not_equal, {});
    	}
    }

    window.addEventListener('load', () => {
        const app = new App({
            target: document.body
        });
    });

}());
