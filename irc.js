//handy functions I've found on the interweb
Array.prototype.remove = function(from, to) {
  var rest = this.slice((to || from) + 1 || this.length);
  this.length = from < 0 ? this.length + from : from;
  return this.push.apply(this, rest);
};

(function () {
  var tcpClient;
  window.myChannels = {};
  var currentChannel;
  var myNick;
  var audio = false;
  var visual = false;
  var highlight = false;
  init();

  function init() {
    $('#options-link').click(function(e) {
      chrome.app.window.create('options.html', {
        width: 200,
        height: 150
      });
    });

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
        l = document.getElementById(currentChannel + '-link');
        l.style.fontStyle = 'normal';
        l.style.color = 'black';
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
    switchChannels('circ-main', false);
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

  function notify(text, channel) {
    if (channel == undefined) {
      channel = this.channel;
    }
    if (text.indexOf(myNick) != -1) {
      if (visual) {
        var notification = webkitNotifications.createNotification(undefined, 'Nick mentioned', channel);
        notification.show();
      }

      if (highlight) {
        var d = document.getElementById(channel + '-link');
        d.style.color = 'red';
      }

      if (audio) {
        var a = new Audio('beep-21.wav');
        a.play();
      }
    }
  }

  function parseResponse(data) {
    lines = data.split("\n");

    //This could get messy.
    for (var i = 0; i < lines.length; i++) {
      //split out the leading field, as it's informational if it starts with :
      if (lines[i].indexOf(":") == 0) {
        var temp_array = lines[i].split(" ");
        var info = temp_array[0];
        temp_array.remove(0);
        if (temp_array.join) {
          lines[i] = temp_array.join(" ");
        }
        else {
          lines[i] = temp_array.toString();
        }
      }


      if (lines[i].indexOf("JOIN") != -1) {
        var joinedNick = info.substr(1, info.indexOf("!") - 1);
        // just don't process our own joins, which solves some race conditions?
        if (joinedNick != myNick) {
          joinedChan = parseChannel(lines[i].split("JOIN ")[1]);
          write(joinedChan, [joinedNick + " has joined channel " + joinedChan]);
          addToNicklist(joinedChan, joinedNick);
        }
        lines.remove(i);
      }
      else if (lines[i].indexOf("PRIVMSG") == 0) {
        if (lines[i].indexOf("#") == 8) {
          var from = info.substr(1, info.indexOf("!") - 1);
          var parts = lines[i].split("PRIVMSG")[1];
          var words = parts.split(" ");
          var text = "";
          var channel;
          for (var i = 0; i < words.length; i++) {
            if (words[i].indexOf("#") != -1) {
              channel = parseChannel(words[i]);
            }
            else if (words[i].indexOf(":") != -1) {
              text = text + from + ": " + words[i].substr(words[i].indexOf(":") + 1, words[i].length - 1);
            }
            else {
              text = text + " " + words[i];
            }
          }
          notify(text, channel);
          write(channel, [text + "\n"]);
        }
        else {
          //okay, this is a private message. who's it from?
          from = info.substr(1, info.indexOf("!") - 1);
          //create a channel for them
          tmpchannel = currentChannel;
          switchChannels('msg-'+from, true);
          switchChannels(tmpchannel, false);
          d = document.getElementById('msg-'+ from + '-link');
          d.style.fontStyle = 'italic';
          //write the message?
          parts = lines[i].split(" ");
          parts.remove(0);
          parts.remove(0);
          parts[0] = parts[0].substr(1, parts[0].length);
          data = from + ": " +  parts.join(" ");
          write('msg-'+from, [data]);
          notify(data, channel);
        }
        lines.remove(i)
      }
      else if (lines[i].indexOf("PING") == 0) {
        pong = lines[i].split("PING")[1];
        send("PONG " + pong);
        lines.remove(i);
      }
      else if (lines[i].indexOf("353") == 0) {
        console.log("parsing names");
        list = lines[i].split(" = ")[1];
        names = list.split(" ");
        name_array = [];
        chan = "";
        lines.remove(i);
        for (var i = 0; i < names.length; i++) {
            if (names[i].indexOf("#") == 0) {
              chan = parseChannel(names[i]);
            }
            else if (names[i].indexOf(":") == 0) {
              names[i] = names[i].substr(1, names[i].length - 1);
              name_array.push(names[i]);
            }
            else {
              name_array.push(names[i]);
            }
        }
        addToNicklist(chan, name_array);
      }
      else if (lines[i].indexOf("366") == 0) {
        lines.remove(i);
      }
      else if (lines[i].indexOf("PART") == 0) {
        parts = lines[i].split(" ");
        partNick = info.substr(1, info.indexOf("!") - 1);
        partChan = parseChannel(parts[1]);
        write(partChan, [partNick + " has left " + partChan]);
        lines[i] = text + "\n";
        if (partNick != myNick) {
          removeFromNicklist(partChan, partNick);
        }
        lines.remove(i);
      }
    }
    write("circ-main", lines);
  }

  function send(data) {
    tcpClient.sendMessage(data);
  }

  function write(where, what) {
    where = "#" + where; //add # back in so that jquery can use it
    for (var i = 0; i < what.length; i++) {
      if (what[i] != "" && what[i] != undefined) {
        $(where).append(what[i]);
        $(where).append("</br>");
        window.scrollTo(0, document.body.scrollHeight);
      }
    }
    $('#chantab').children(where+'-link').css('fontStyle', 'italic');
  }

  function parseChannel(channel) {
    if (channel.charAt(0) == ':') {
      return channel.substr(2, channel.length);
    }
    if (channel.charAt(0) == '#') {
      return channel.substr(1, channel.length);
    }
    return channel;
  }

  function addToNicklist(channel, nick) {
    var _channel = this.channel;
    console.log('adding to ' + _channel);
    if (nick == undefined) {
      return;
    }
    if (_channel in window.myChannels) {
      if (nick.push) {
        for (var i = 0; i < nick.length; i++) {
          add(_channel, nick[i]);
        }
      }
      else {
        add(_channel, nick);
      }
    }

    function add(channel, nick) {
      if (window.myChannels[channel].indexOf(nick) == -1) {
        window.myChannels[channel].push(nick);
      }
    }

    redrawNicklist(channel);
  }

  function removeFromNicklist(channel, nick) {
    var _channel = this.channel;
    if (nick == undefined) {
      return;
    }
    if (_channel in myChannels) {
      var idx = window.myChannels[_channel].indexOf(nick);
      var idx2 = window.myChannels[_channel].indexOf("@"+nick);
      if (idx != -1) {
        window.myChannels[_channel].remove(idx);
      }
      else if (idx2 != -1) {
        window.myChannels[_channel].remove(idx2);
      }
    }

    redrawNicklist(channel);
  }

  function redrawNicklist(channel) {
    var _channel = channel;
    if (window.myChannels[_channel] == undefined) {
      _channel = this.channel;
    }

    list = document.getElementById('nicklist');
    $(list).empty();
    for (var i = 0; i < window.myChannels[_channel].length; i++) {
      if (window.myChannels[_channel][i] != "") {
        t = document.createTextNode(window.myChannels[_channel][i]);
        list.appendChild(t);
        list.appendChild(document.createElement("BR"));
      }
    }
  }



  function leaveChannel(channel) {
    delete myChannels[channel]
    c = document.getElementById('chantab');
    a = document.getElementById(channel + '-link');
    c.removeChild(a);
    m = document.getElementById('messages');
    p = document.getElementById(channel);
    m.removeChild(p);
    switchChannels('circ-main', false);
  }

  function switchChannels(channel, msg) {
    currentChannel = channel;
    if (!(channel in myChannels)) {
      //this is a new channel
      //first add a link
      c = document.getElementById('chantab');
      a = document.createElement('A');
      if (msg) {
        n = document.createTextNode(channel);
      }
      else {
        n = document.createTextNode('#'+channel);
      }
      a.title = channel;
      a.id = channel + '-link';
      if (msg) {
        a.onclick = function() { switchChannels(channel, true) };
      }
      else {
        a.onclick = function() { switchChannels(channel, false) };
      }
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

      myChannels[channel] = [''];

      addToNicklist(channel, myNick);
    }
    else {
      //we've been here before, restore it.
      redrawNicklist(channel);
      currentChannel = channel;
      a = document.getElementById(channel + '-link');
      //clear the highlight, whether or not it exists
      a.style.color = 'black';
      //set the underlines
      $('#chantab').children('a').css('text-decoration', 'none');
      a.style.textDecoration = 'underline';
      a.style.fontStyle = 'normal';

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
    // Let's figure out what they wanted to do, so we can take appropriate action
    switch (parts[0]) {
      case "CONNECT":
        doConnect([parts[1], parts[2], parts[3]]);
        return;
      case "MSG":
        if (!(parts[1] in myChannels)) {
          switchChannels("msg-"+parts[1], true);
        }
        break;
      case "JOIN":
        if (parts[1].charAt(0) != '#') {
          //channel command will fail without this, lets add it
          parts[1] = '#' + parts[1];
        }
        channel = parseChannel(parts[1]);
        if (!(channel in myChannels)) {
          switchChannels(channel, false);
        }
        break;
      case "NICK":
        myNick = parts[1];
        break;
      case "PART":
        if (parts[1] == undefined) {
          parts[1] = currentChannel;
        }
        if (parts[1].charAt(0) != '#') {
          //part will fail without this
          parts[1] = '#' + parts[1];
        }
        channel = parseChannel(parts[1]);
        leaveChannel(channel);
        if (channel.indexOf("msg-") == 0) {
          // not a real channel
          return;
        }
      default:
        break;
    }
    command = parts.join(" ");
    display = command;
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
      if (currentChannel.indexOf('msg-') == 0) {
        to = currentChannel.split("-")[1];
        data = "PRIVMSG " + to + " :" + data;
      }
      else {
        data = "PRIVMSG #" + currentChannel + " " + data;
      }
    }
    send(data);
    write(currentChannel, [display]);
  }


})();
