import App from './App.svelte';
import './style/common.scss';

window.addEventListener('load', () => {
    const app = new App({
        target: document.body
    });
})