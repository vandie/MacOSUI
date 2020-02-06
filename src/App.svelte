<script>
  // logic goes here
  import NavBar from "./components/NavBar.svelte";
  import Window from "./components/Window.svelte";
  import Dock from "./components/Dock.svelte";
  import { processes, app } from "./stores/processes.js";
  import githubIcon from "./assets/icons/Octocat.svg";
  import Github from "./components/Github.svelte";

  const github = new app("Github", Github, githubIcon);

  processes.addProcess(github);
</script>

<style lang="scss">

</style>

<header>
  <NavBar />
</header>
<main class="main">
  {#each $processes as process}
    {#if process.open}
      <Window noPadding={true}>
        <svelte:component this={process.program} />
      </Window>
    {/if}
  {/each}
  <!-- <Window noPadding={true}>
		<img alt="test" src="https://www.dumpaday.com/wp-content/uploads/2018/09/photos-21-3.jpg" width="100%" height="480px" />
	</Window> -->
  <Dock />
</main>
