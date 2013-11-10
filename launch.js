function onLaunched(launchData) {
  chrome.app.window.create('irc.html', {
    width: 680,
    height: 480
  });
}

chrome.app.runtime.onLaunched.addListener(onLaunched)
