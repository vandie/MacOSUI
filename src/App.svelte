<script>
	// logic goes here
	import NavBar from './components/NavBar.svelte';
	import Window from './components/Window.svelte';
	import Dock from './components/Dock.svelte';
</script>

<style lang="scss">
</style>
<header>
	<NavBar></NavBar>
</header>
<main class="main">
	<Window noPadding={true}>
		<img alt="test" src="http://www.dumpaday.com/wp-content/uploads/2018/09/photos-21-3.jpg" width="100%" height="480px" />
	</Window>
	<Dock />
</main>