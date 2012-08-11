function onLaunched(launchData) {
  chrome.app.window.create('irc.html', {
    width: 680,
    height: 480
  });
}

chrome.experimental.app.onLaunched.addListener(onLaunched)
