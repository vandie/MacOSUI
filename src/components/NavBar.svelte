<script>
    import NavBarItem from "./NavBarItem.svelte";
    import { nav } from '../stores/menu.js';
</script>
<style lang="scss">
    @import 'variables.scss';
    :global(.nav-bar) {
        z-index: 500;
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        display: flex;
        height: 22px;
        padding: 1px;
        justify-content: flex-start;
        align-items: center;
        background-color: color(grey5,2);
        backdrop-filter: blur(10px);
        user-select: none;

        &__nav {
            display: flex;
            justify-content: flex-start;
            align-items: center;
            list-style: none;
            padding: 0;
            margin: 0;
        }
    }
</style>

<div class="nav-bar">
    <ul class="nav-bar__nav">
        {#each $nav as item}
            <NavBarItem {...item} />
        {/each}
    </ul>
</div>