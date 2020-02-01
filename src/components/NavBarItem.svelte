<script>
    export let text = "Error";
    export let subItems = [];
    export let action = () => {};
    export let active = false;
    export let icon;

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
    }

    const activate = (event) => {
        active = true;
    }

    document.addEventListener("mousedown", (event) => {
        if(isDescendant(domItem, event.target) || event.target === domItem) return;
        active = false
    });
</script>
<style lang="scss">
    @import 'variables.scss';
    :global(.nav-bar__item) {
        display: inline-block;
        position: relative;
        padding: 0;
        margin: 0;

        &__button {
            display: flex;
            justify-content: space-between;
            align-items: center;
            width: auto;
            background: none;
            border: none;
            outline: none;
            color: color(grey0);
            font-size: .9rem;
            min-width: 100%;
            text-align: left;

            svg {
                display: block;
                position: relative;
                object-fit: contain;
                height: .9rem;
                padding: 0 .3rem;
                path,circle,rect { 
                    fill: color(grey0);
                }
            }

            &:hover {
                background: color(blue);
            }
        }
        
        &__sub-nav {
            position: absolute;
            padding: 0;
            margin: 0;
            min-width: 100%;
            background: color(grey5,2);
            border-radius: 0 0 .2rem .2rem;
            backdrop-filter: blur(10px);
            user-select: none;

            .nav-bar__item {
                min-width: 100%;
                padding: 0.2rem 0;
                display: block;
            }
        }

        &__sub-nav .nav-bar__item__button {
            padding-left: 1rem;
            min-width: 10rem;
            width: 100%;
            
            &--has-children::after{
                content: "▶";
                position: relative;
                display: inline-block;
            }
        }


        &__sub-nav &__sub-nav {
            left: 100%;
            top: 0;
        }
    }
    :global(.nav-bar__nav > .nav-bar__item) {
        padding: 0 .2rem;
    }
    :global(.nav-bar__nav > :first-child > .nav-bar__item__button) {
        font-weight: 800;
    }
</style>
    <li class="nav-bar__item" on:mouseup={activate} bind:this={domItem}>
        {#if subItems.length}
            <button class="nav-bar__item__button nav-bar__item__button--has-children">{@html icon || text}</button>
            {#if active}
            <ul class="nav-bar__item__sub-nav">
                {#each subItems as subItem}
                    <svelte:self {...subItem} />
                {/each}
            </ul>
            {/if}
        {:else}
            <button class="nav-bar__item__button" on:click={action}>{@html icon || text}</button>
        {/if}
    </li>