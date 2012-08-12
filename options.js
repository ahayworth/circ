window.onload = function() {
  function save_options() {
    var audio = document.getElementById("audio").checked;
    var visual = document.getElementById("visual").checked;
    var highlight = document.getElementById("highlight").checked;

    chrome.storage.sync.set({ 'audio':audio, 'visual':visual, 'highlight':highlight }, function() {
      alert("settings saved");
    });
  }

  function restore_options() {
    var settings = chrome.storage.sync.get(['audio', 'visual', 'highlight'], function(data) {
      var a = document.getElementById("audio");
      a.checked = data['audio'];
      var v = document.getElementById("visual");
      v.checked = data['visual'];
      var h = document.getElementById("highlight");
      h.checked = data['highlight'];
    });
  }


  restore_options();
  var b = document.getElementById("save_button");
  b.onclick = function() { save_options() };
}
