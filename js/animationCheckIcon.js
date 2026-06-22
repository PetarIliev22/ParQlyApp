export function createLottie(containerId, path, loop = false, autoplay = false) {
    return lottie.loadAnimation({
        container: document.getElementById(containerId),
        renderer: 'svg',
        loop,
        autoplay,
        path
    });
}