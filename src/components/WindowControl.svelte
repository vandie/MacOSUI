<script>
    export let text = "Close";
    export let type = "close";
    export let action = () => {};
</script>

<style lang="scss">
    @import 'variables.scss';

    .window-control {
        appearance: none;
        font-size: 0;
        width: .7rem;
        height: .7rem;
        position: relative;
        display: block;
        margin: 0;
        border-radius: 50%;
        border: none;
        outline:none;
        margin: 0 .25rem 0;
        padding: 0;
        cursor: pointer;

        &:active, &:hover {
            border: none;
            outline:none;
        }

        &--min {
            background: color(yellow);
            &:hover, &:active {
                background: trueen(color(yellow), 10%);
            }
        }

        &--max {
            background: color(green);
            &:hover, &:active {
                background: trueen(color(green), 10%);
            }
        }

        &--close {
            background: color(red);
            &:hover, &:active {
                background: trueen(color(red), 10%);
            }
        }
    }
</style>

<button class="window-control window-control--{type}" on:click={action}>{text}</button>