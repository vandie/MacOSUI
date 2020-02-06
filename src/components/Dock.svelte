<script>
  import AppIcon from "./AppIcon.svelte";
  import githubIcon from "../assets/icons/Octocat.svg";
  import { processes, app } from "../stores/processes.js";

  export let side = "right";

  const openGithub = () => {
    window.open("https://github.com/vandie/MacOSUI", "_blank");
  };
</script>

<style lang="scss">
  @import "variables.scss";
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
    padding: 0.4rem 0.2rem 0.2rem;
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    margin: 0 auto;
    border-radius: 0.2rem 0 0 0.2rem;
  }
</style>

<section class="dock">
  {#each $processes as process}
    <AppIcon
      name={process.name}
      icon={process.icon}
      active={process.running}
      action={() => {
        process.launch();
      }} />
  {/each}
</section>
