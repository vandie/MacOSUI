<script>
    import AppIcon from "./AppIcon.svelte";

    export let side = "right";
</script>
<style lang="scss">
    @import 'variables.scss';
    .dock {
        border: 1px solid color(grey0, 9);
        background: color(grey4, 7);
        backdrop-filter: blur(3px);
        border-bottom: 0;
        min-width: 4rem;
        min-height: 4rem;
        position: fixed;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: .4rem .2rem .2rem;
        position: absolute;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        margin: 0 auto;
        border-radius: .2rem 0 0 .2rem;
    }
</style>
<section class="dock">
    <AppIcon active={true}/>
    <AppIcon/>
    <AppIcon/>
    <AppIcon/>
</section>