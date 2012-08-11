(function () {
  var tcpClient;
  init();

  function init() {

    var host = 'irc.freenode.net';
    var port = 6667;

    tcpClient = new TcpClient(host, port);
    tcpClient.connect(function() {
      tcpClient.addResponseListener(function(data) {
        parseResponse(data);
      });
    });

    var cmdBox = document.getElementById("cmdBox");
    $(cmdBox).keydown(function(e) {
      if (e.keyCode == 13) {
        parseInput($(cmdBox).val());
        $(cmdBox).val('');
        $(window).focus($(cmdBox));
      }
    });

    $(window).focusin(function(e) {
      $(window).focus($(cmdBox));
    });


    $(window).focus($(cmdBox));
  }

  function parseResponse(data) {
    if (data.charAt(0) == ":") {
      parseCommand(data);
      return;
    }
    lines = data.split("\n");
    write("messages", lines);
  }

  function send(data) {
    tcpClient.sendMessage(data);
  }

  function write(where, what) {
    var d = document.getElementById(where);
    for (var i = 0; i < what.length; i++) {
      if (what[i] != "") {
        d.appendChild(document.createTextNode(what[i]));
        d.appendChild(document.createElement("BR"));
        window.scrollTo(0, document.body.scrollHeight);
      }
    }
  }

  function parseCommand(data) {
    lines = data.split("\n");
    write("messages", lines);
  }

  function parseInput(data) {
    // The user wants to send a command.
    if (data.charAt(0) == "/") {
      parts = data.split(/\s+/);
      parts[0] = parts[0].replace("/", "");
      parts[0] = parts[0].toUpperCase();
      data = parts.join(" ");
    }
    console.log(data);
    send(data);
  }

})();
