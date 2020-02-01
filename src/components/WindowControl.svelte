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

        &[type="min"] {
            background: color(yellow);
            &:hover, &:active {
                background: color(yellow,2);
            }
        }

        &[type="max"] {
            background: color(green);
            &:hover, &:active {
                background: color(green,2);
            }
        }

        &[type="close"] {
            background: color(red);
            &:hover, &:active {
                background: color(red,2);
            }
        }
    }
</style>

<button class="window-control" type={type} on:click={action}>{text}</button>