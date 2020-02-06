<script>
    import appleIcon from "../assets/icons/apple.svg";
    export let icon = appleIcon;
    export let name = "App";
    export let active = false;
    export let action = () => {};
</script>
<style lang="scss">
    @import 'variables.scss';
    .app-icon {
        border: none;
        outline: none;
        background: none;
        width: 4rem;
        position: relative;
        padding: 0;
        padding-bottom: .6rem;
        margin: 0;
        overflow: visible;
    }

    :global(.app-icon svg) {
        object-fit: contain;
        height: 100%;
        width: 100%;
        object-position: center;
        filter: drop-shadow( 0 0 .2rem color(grey4, 2));
    }

    .app-icon[active=true]::after {
        background: color(grey0, 2);
        left: 0;
        right: 0;
        bottom: .1rem;
        width: .3rem;
        height: .3rem;
        display: block;
        content: "active";
        font-size: 0;
        position: absolute;
        margin: 0 50%;
        transform: translateX(-50%);
        border-radius: 50%;
    }

    .app-icon:hover::before {
        border: 1px solid color(grey0, 9);
        position: absolute;
        top: -2.5rem;
        margin-left: 50%;
        transform: translateX(-50%);
        content: attr(name);
        color: color(grey0, 2);
        padding: .2rem;
        border-radius: .2rem;
        background: color(grey4, 4);
        display: block;
        white-space: nowrap;
    }
</style>

<button class="app-icon" active={active} name={name} on:click={action}>
    {@html icon}
</button>