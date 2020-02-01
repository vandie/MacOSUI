<script>
    import WindowControl from "./WindowControl.svelte";

    let mouseDown = false;

    export let allow = {
        min: true,
        max: true,
        close: true,
        move: true
    }

    export let noPadding = false;

    export let pos = {
        x: Math.floor(Math.random() * 50) + 10,
        y: Math.floor(Math.random() * 50) + 22,
        localX: 0,
        localY: 0,
        isMoving: false,
        autoMoving: false,
        size: "small",
        oldSize: "small"
    }

    let limits = {
        minY: 22
    }

    const startMoving = (event) => {
        mouseDown = true;
        setTimeout(() => {
            if(!mouseDown) return; //we want to be sure the user is trying to move the window
            pos.isMoving = allow.move;
            pos.localX = event.clientX - event.target.getBoundingClientRect().left;
            pos.localY = event.clientY - event.target.getBoundingClientRect().top;
        }, 200)
    }
    const stopMoving = (event) => { 
        mouseDown = false
        pos.isMoving = false;
    }
    const moving = (event) => {
        if(pos.isMoving){
            pos.x = event.clientX - pos.localX;
            pos.y = event.clientY - pos.localY;
            
            if(pos.y < limits.minY) pos.y = limits.minY;
        }
    }

    const maximise = (event) => {
        if(pos.size === "max"){
            pos.size = pos.oldSize
            return;
        }
        pos.autoMoving = true;
        pos.oldSize = pos.size;
        pos.size = "max";
        pos.x = 0;
        pos.y = limits.minY;
        setTimeout(() => pos.autoMoving = false, 200);
    }

    document.addEventListener("mouseup", stopMoving);
    document.addEventListener("mousemove", moving);
</script>
<style lang="scss">
    @import 'variables.scss';

    .window {
        display: block;
        position: relative;
        border: 1px solid color(grey0, 9);
        border-top: 1.8rem solid color(grey3);
        border-radius: 0.2rem;
        background: color(grey5);
        color: color(grey0);
        padding: 0;
        max-width: 100%;
        transition: 210ms ease-in-out;
        transition-property: width, height;
        box-shadow: 0 4px 8px 0 rgba(0, 0, 0, 0.2), 0 6px 20px 0 rgba(0, 0, 0, 0.19);

        //Sub Components
        &__nav {
            display: flex;
            position: relative;
            margin-top: -1.8rem;
            height: 1.8rem;
            width: 100%;
            justify-content: flex-start;
            align-items: center;
            padding: 0 .3rem;
        }

        &__body {
            padding: .6rem;
        }

        &__body--no-padding {
            padding: 0;
        }

        //Modifiers
        &[size="small"] {
            width: 25rem;
            height: auto;
        }
        &[size="med"] {
            width: 30rem;
            height: auto;
        }
        &[size="large"] {
            width: 40rem;
            height: auto;
        }
        &[size="max"] {
            width: 100%;
            height: 100%;
        }
        &[moving=true] {
            transition-property: width, height, left, top;
        }
    }
</style>

<div 
    class="window"
    style="left:{pos.x}px; top:{pos.y}px;"
    moving={pos.autoMoving}
    size={pos.size}
>
    <section class="window__nav" on:mousedown={startMoving} on:dblclick={allow.max && maximise}>
        {#if allow.close}<WindowControl type="close" text="Close"/>{/if}
        {#if allow.min}<WindowControl type="min" text="Minify"/>{/if}
        {#if allow.max}<WindowControl action={maximise} type="max" text="Maxify"/>{/if}
    </section>
    <section class="window__body {noPadding ? "window__body--no-padding" : ""}">
        <slot></slot>
    </section>
</div>