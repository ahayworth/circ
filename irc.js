//handy functions I've found on the interweb
Array.prototype.remove = function(from, to) {
  var rest = this.slice((to || from) + 1 || this.length);
  this.length = from < 0 ? this.length + from : from;
  return this.push.apply(this, rest);
};

(function () {
  var tcpClient;
  var myChannels = {}
  var currentChannel;
  var myNick;
  var audio = false;
  var visual = false;
  var highlight = false;
  init();

  function init() {
    var cmdBox = document.getElementById("cmdBox");
    $(cmdBox).keydown(function(e) {
      if (e.keyCode == 13) {
        parseInput($(cmdBox).val());
        $(cmdBox).val('');
        $(cmdBox).focus();
      }
    });
    $(window).click(function(e) {
      if (currentChannel) {
        // clear the highlight on window focus
        switchChannels(currentChannel);
      }
      $(cmdBox).focus();
    });

    //settings
    chrome.storage.sync.get(['audio', 'visual', 'highlight'], function(data) {
      audio = data['audio'];
      visual = data['visual'];
      highlight = data['highlight'];
    });

    $(cmdBox).focus();

    //fake out like circ-main is a real channel 
    messages = document.getElementById("messages");
    switchChannels('circ-main');
    write('circ-main', ["/connect host port nick"])
  }

  function doConnect(data) {
    var host = data[0];
    var port = parseInt(data[1]);
    var nick = data[2];
    myNick = nick;

    if (tcpClient) {
     tcpClient.disconnect;
     tcpClient.host = host;
     tcpClient.port = port;
    }
    else {
      tcpClient = new TcpClient(host, port);
    }
    tcpClient.connect(function() {
      tcpClient.addResponseListener(function(data) {
        parseResponse(data);
      });
      send("NICK " + nick);
      send("USER " + nick + ' "' + nick + '"' + ' "localhost" ' + ":" + nick);
    });

  }

  function parseResponse(data) {
    lines = data.split("\n");

    //This could get messy.
    for (var i = 0; i < lines.length; i++) {
      console.log("raw :" + lines[i]);
      //split out the leading field, as it's informational if it starts with :
      if (lines[i].indexOf(":") == 0) {
        var temp_array = lines[i].split(" ");
        var info = temp_array[0];
        temp_array.remove(0);
        if (temp_array.join) {
          lines[i] = temp_array.join(" ");
        }
        else {
          lines[i] = temp_array;
        }
      }

      lines[i] = lines[i].toString();

      if (lines[i].indexOf("JOIN") != -1) {
        var joinedNick = info.substr(1, info.indexOf("!") - 1);
        // just don't process our own joins, which solves some race conditions?
        if (joinedNick != myNick) {
          var joinedChan = lines[i].split("JOIN ")[1];
          joinedChan = joinedChan.substr(2, joinedChan.length); //need to pull off a colon
          write(joinedChan, [joinedNick + " has joined channel " + joinedChan]);
          updateNicklist(joinedChan, joinedNick);
          redrawNicklist(joinedChan);
        }
        lines.remove(i);
      }
      else if (lines[i].indexOf("PRIVMSG") != -1) {
        if (lines[i].indexOf("#") != -1) {
          var from = info.substr(1, info.indexOf("!") - 1);
          var parts = lines[i].split("PRIVMSG")[1];
          var words = parts.split(" ");
          var text = "";
          var channel;
          for (var i = 0; i < words.length; i++) {
            if (words[i].indexOf("#") != -1) {
              channel = words[i].substr(1, words[i].length);
            }
            else if (words[i].indexOf(":") != -1) {
              text = text + from + ": " + words[i].substr(words[i].indexOf(":") + 1, words[i].length - 1);
            }
            else {
              text = text + " " + words[i];
            }
          }
          write(channel, [text + "\n"]);

          if (text.indexOf(myNick) != -1) {
            if (visual) {
              var notification = webkitNotifications.createNotification(undefined, 'Nick mentioned', channel);
              notification.show();
            }

            if (highlight) {
              var d = document.getElementById(channel + '-link');
              d.style.color = 'red';
            }
          }
        }
        //TODO handle real private messages here
        lines.remove(i)
      }
      else if (lines[i].indexOf("PING") == 0) {
        var pong = lines[i].split("PING")[1];
        send("PONG " + pong);
        lines.remove(i);
      }
      else if (lines[i].indexOf("353") == 0) {
        console.log("parsing names");
        var list = lines[i].split(" = ")[1];
        var names = list.split(" ");
        var name_array = [];
        var chan;
        lines.remove(i);
        for (var i = 0; i < names.length; i++) {
            if (names[i].indexOf("#") == 0) {
              chan = names[i].substr(1, names[i].length);
            }
            else if (names[i].indexOf(":") == 0) {
              names[i] = names[i].substr(1, names[i].length - 1);
              name_array.push(names[i]);
            }
            else {
              name_array.push(names[i]);
            }
        }
        for (var i = 0; i < name_array.length; i++) {
          updateNicklist(chan, name_array[i]);
        }
        redrawNicklist(chan);
      }
      else if (lines[i].indexOf("366") == 0) {
        lines.remove(i);
      }
      else if (lines[i].indexOf("PART") == 0) {
        parts = lines[i].split(" ");
        partNick = info.substr(1, info.indexOf("!") - 1);
        partChan = parts[1].substr(1, parts[1].length);
        write(partChan, [partNick + " has left " + partChan]);
        lines[i] = text + "\n";
        removeFromNicklist(partChan, partNick);
        redrawNicklist(partChan);
      }
      else {
        lines[i] = lines[i].replace(/^:[\w\.\!\@\~\-]+\s/, "");
      }
    }
    write("circ-main", lines);
  }

  function send(data) {
    tcpClient.sendMessage(data);
  }

  function write(where, what) {
    where = "#" + where;
    for (var i = 0; i < what.length; i++) {
      if (what[i] != "" && what[i] != undefined) {
        $(where).append(what[i]);
        $(where).append("</br>");
        window.scrollTo(0, document.body.scrollHeight);
      }
    }
  }

  function updateNicklist(chan, nick) {
    if (nick == undefined) {
      return;
    }
    if (chan in myChannels) {
      if (myChannels[chan].indexOf(nick) == -1) {
        myChannels[chan].push(nick);
      }
    }
    else {
      myChannels[chan] = [nick];
    }
  }

  function removeFromNicklist(chan, nick) {
    if (nick == undefined) {
      return;
    }
    if (chan in myChannels) {
      if (myChannels[chan].indexOf(nick) != -1) {
        myChannels[chan].remove(nick);
      }
      else if (myChannels[chan].indexOf("@" + nick) != -1) {
        myChannels[chan].remove(nick);
      }
    }
  }

  function redrawNicklist(chan) {
    var list = document.getElementById('nicklist');
    $(list).empty();
    for (var i = 0; i < myChannels[chan].length; i++) {
      var t = document.createTextNode(myChannels[chan][i]);
      list.appendChild(t);
      list.appendChild(document.createElement("BR"));
    }
  }

  function switchChannels(channel) {
    currentChannel = channel;
    if (!(channel in myChannels)) {
      //this is a new channel
      //first add a link
      c = document.getElementById('chantab');
      a = document.createElement('A');
      n = document.createTextNode(channel);
      a.title = channel;
      a.id = channel + '-link';
      a.onclick = function() { switchChannels(channel) };
      a.appendChild(n);
      c.appendChild(a);

      //then, set the style
      $('#chantab').children('a').css('text-decoration', 'none');
      a.style.textDecoration = 'underline';

      //create a new messages div
      d = document.createElement("DIV");
      d.id = channel;
      //hide the others and show this one
      messages = document.getElementById("messages");
      $(messages).children('div').css('display', 'none');
      messages.appendChild(d);

      //special case for circ-main
      myChannels['circ-main'] = '';

      updateNicklist(channel, myNick);
      redrawNicklist(channel);
    }
    else {
      //we've been here before, restore it.
      currentChannel = channel;
      redrawNicklist(channel);
      a = document.getElementById(channel + '-link');
      //clear the highlight, whether or not it exists
      a.style.color = 'black';
      //set the underlines
      $('#chantab').children('a').css('text-decoration', 'none');
      a.style.textDecoration = 'underline';

      //hide other divs and restore this one
      messages = document.getElementById("messages");
      $(messages).children('div').css('display', 'none');
      current = document.getElementById(channel);
      current.style.display = 'block';
    }
    window.scrollTo(0, document.body.scrollHeight);
  }

  function parseCommand(command) {
    parts = command.split(/\s+/);
    parts[0] = parts[0].replace("/", "");
    parts[0] = parts[0].toUpperCase();
    command = parts.join(" ");
    display = command;
    // Let's figure out what they wanted to do, so we can take appropriate action
    switch (parts[0]) {
      case "CONNECT":
        doConnect([parts[1], parts[2], parts[3]]);
        return;
      case "JOIN":
        if (!(parts[1] in myChannels)) {
          switchChannels(parts[1].substr(1, parts[1].length));
        }
        break;
      case "NICK":
        myNick = parts[1];
        break;
      case "PART":
        var chan = parts[1].substr(1, parts[1]);
        var d = document.getElementById('nicklist');
        $(d).empty();
        delete myChannels[chan];
        var c = document.getElementById('chantab');
        var a = document.getElementById(chan + '-link');
        $(c).remove(a);
      default:
        break;
    }
    send(command);
    write("circ-main", [display]);
  }

  function parseInput(data) {
    // The user wants to send a command.
    if (data.charAt(0) == "/") {
      parseCommand(data);
      return;
    }
    // they must want to talk to the current channel
    else {
      display = myNick + ": " + data;
      data = "PRIVMSG #" + currentChannel + " " + data;
    }
    send(data);
    write(currentChannel, [display]);
  }


})();
